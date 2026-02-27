const net = require("net");
const { parseFrame, encError } = require("./resp");
const { handleCommand } = require("./command");
const storage = require("./storage");

//define environment variables for this process 
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 6379;
const HOST = process.env.HOST || "0.0.0.0";

// Periodic cleanup of expired keys (lazy expiration is primary)
setInterval(() => storage.cleanup(), 60_000).unref();

const server = net.createServer((socket) => {
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 30_000);

  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`+ Client connected: ${remote}`);

  let buf = Buffer.alloc(0);

  // Backpressure-aware write helper.
  function writeRaw(respString) {
    const ok = socket.write(respString, "binary");
    if (!ok) socket.pause();
  }

  function endWithProtocolError(reason) {
    writeRaw(encError(reason));
    socket.end();
  }

  socket.on("drain", () => socket.resume());

  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);

    while (true) {
      const res = parseFrame(buf, 0);
      if (res.needMore) break;
      if (res.protocolError) {
        endWithProtocolError(res.protocolError);
        return;
      }
      const node = res.node;
      const next = res.nextOffset;
      buf = buf.slice(next);

      try {
        handleCommand(node, writeRaw, endWithProtocolError);
      } catch (e) {
        console.error("Handler error:", e);
        writeRaw(encError("ERR internal error"));
      }
    }
  });

  socket.on("end", () => console.log(`- Client ended: ${remote}`));
  socket.on("close", () => console.log(`x Client closed: ${remote}`));
  socket.on("error", (err) => console.error(`! Socket error (${remote}):`, err.message));
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

server.listen(PORT, HOST, () => {
  const addr = server.address();
  console.log(`RESP2 server listening on ${addr.address}:${addr.port}`);
});

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\nReceived ${sig}, shutting down...`);
    server.close(() => {
      console.log("Server stopped.");
      process.exit(0);
    });
  });
}
