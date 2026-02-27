// multi_client.js
// Spawns multiple concurrent TCP clients to your RESP2 server.
// Each client runs the same command sequence and prints parsed replies.
//
// Usage:
//   node multi_client.js [numClients] [host] [port]
// Example:
//   node multi_client.js 10 127.0.0.1 6379

const net = require("net");
const { parseFrame, encArray } = require("./resp"); // reuse your RESP encoder/decoder

const numClients = parseInt(process.argv[2] || "5", 10);
const HOST = process.argv[3] || "127.0.0.1";
const PORT = parseInt(process.argv[4] || "6379", 10);

function respArray(parts) {
  // You can also use encArray(parts), but parts here are strings/Buffers;
  // encArray will treat strings as bulk by default. Using encArray is simpler:
  return encArray(parts);
}

function send(conn, parts) {
  const payload = respArray(parts);
  // Write as binary to preserve exact payload, like in your current client:
  conn.write(payload, "binary");
}

// Pretty-print a parsed RESP node for terminal output
function formatNode(node) {
  switch (node.type) {
    case "simple": return `+${node.value}`;
    case "error": return `-${node.value}`;
    case "integer": return `:${node.value}`;
    case "bulk": return node.value === null ? `$-1` : `$${node.value.length} "${node.value.toString("utf8")}"`;
    case "array":
      if (node.value === null) return `*-1`;
      return `*${node.value.length} [${node.value.map(formatNode).join(", ")}]`;
    default:
      return `<???>`;
  }
}

function createClient(id) {
  return new Promise((resolve, reject) => {
    const conn = net.createConnection({ host: HOST, port: PORT }, () => {
      console.log(`[C${id}] Connected`);
      conn.setNoDelay(true);
      conn.setKeepAlive(true, 30_000);

      // Use unique keys per client to avoid conflicts
      const fooKey = `foo:${id}`;
      const ttlKey = `k:${id}`;

      // Send a sequence of commands without waiting (pipelined)
      send(conn, ["PING"]);
      send(conn, ["PING", `hello-from-${id}`]);
      send(conn, ["ECHO", `hi there (client ${id})`]);
      send(conn, ["SET", fooKey, `bar-${id}`]);
      send(conn, ["GET", fooKey]);
      send(conn, ["SET", ttlKey, `v-${id}`, "EX", "1"]);
      setTimeout(() => send(conn, ["GET", ttlKey]), 1500); // should be null bulk after TTL
      // error cases
      send(conn, ["GET"]);    // wrong arity
      send(conn, ["FOOBAR"]); // unknown cmd

      // Optional: close after a bit (so the script exits)
      setTimeout(() => conn.end(), 2500);
    });

    let buf = Buffer.alloc(0);

    conn.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);

      // Drain all complete frames; keep remainder in buf
      while (true) {
        const res = parseFrame(buf, 0);
        if (res.needMore) break;
        if (res.protocolError) {
          console.error(`[C${id}] Protocol error: ${res.protocolError}`);
          conn.end();
          return;
        }
        const node = res.node;
        const next = res.nextOffset;
        buf = buf.slice(next);

        console.log(`[C${id}] < ${formatNode(node)}`);
      }
    });

    conn.on("end", () => console.log(`[C${id}] Server ended connection`));
    conn.on("close", () => {
      console.log(`[C${id}] Closed`);
      resolve();
    });
    conn.on("error", (e) => {
      console.error(`[C${id}] Error: ${e.message}`);
      reject(e);
    });
  });
}

(async () => {
  console.log(`Spawning ${numClients} clients to ${HOST}:${PORT} ...`);
  // Stagger starts a bit to avoid thundering herd on connect
  const jobs = Array.from({ length: numClients }, (_, i) =>
    new Promise((r) => setTimeout(r, i * 50)).then(() => createClient(i + 1))
  );

  try {
    await Promise.allSettled(jobs);
  } finally {
    console.log(`All clients done.`);
    // Give a moment for any final logs to flush
    setTimeout(() => process.exit(0), 200);
  }
})();