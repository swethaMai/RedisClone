const net = require("net");

function respArray(parts) {
  // parts: array of strings or Buffers; encodes as RESP Array of Bulk Strings
  const bulks = parts.map((p) => {
    const buf = Buffer.isBuffer(p) ? p : Buffer.from(String(p), "utf8");
    return Buffer.from(`$${buf.length}\r\n`, "utf8")
      .toString("binary") + buf.toString("binary") + "\r\n";
  }).join("");

  return Buffer.from(`*${parts.length}\r\n`, "utf8").toString("binary") + bulks;
}

function send(conn, parts) {
  const payload = respArray(parts);
  conn.write(payload, "binary");
}

const conn = net.createConnection({ host: "127.0.0.1", port: 6379 }, () => {
  console.log("Connected, sending tests...");

  // PING
  send(conn, ["PING"]);

  // PING hello
  send(conn, ["PING", "hello"]);

  // ECHO hi there
  send(conn, ["ECHO", "hi there"]);

  // SET foo bar
  send(conn, ["SET", "foo", "bar"]);

  // GET foo
  send(conn, ["GET", "foo"]);

  // SET with EX 1
  send(conn, ["SET", "k", "v", "EX", "1"]);
  setTimeout(() => send(conn, ["GET", "k"]), 1500); // should return null bulk

  // Error cases
  send(conn, ["GET"]);          // wrong arity
  send(conn, ["FOOBAR"]);       // unknown cmd
});

conn.on("data", (data) => {
  process.stdout.write("SERVER> " + data.toString("utf8"));
});

conn.on("end", () => console.log("\nServer ended connection."));
conn.on("close", () => console.log("Connection closed."));
conn.on("error", (e) => console.error("Client error:", e.message));