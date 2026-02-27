// command.js
// Parses a RESP2 command array and writes an encoded RESP2 response.
// Depends on resp.js (encoders) and storage.js (KV store with TTL).

const { encSimple, encError, encBulk } = require("./resp");
const storage = require("./storage");

// normalize command name
function toUpperAscii(bufOrStr) {
  return (Buffer.isBuffer(bufOrStr) ? bufOrStr.toString("utf8") : String(bufOrStr)).toUpperCase();
}

/**
 * handleCommand(node, write, endWithProtocolError)
 * - node: parsed RESP node (expected top-level array of bulk strings)
 * - write: (respString) => void   (writes encoded RESP string, with CRLF)
 * - endWithProtocolError: (reason) => void  (writes protocol error, closes socket)
 */
function handleCommand(node, write, endWithProtocolError) {
  if (!node || node.type !== "array" || !Array.isArray(node.value)) {
    endWithProtocolError("Protocol error: expected Array for command");
    return;
  }

  const elements = node.value;
  const parts = [];

  for (const el of elements) {
    if (el.type !== "bulk") {
      endWithProtocolError("Protocol error: expected Bulk Strings in command array");
      return;
    }
    if (el.value === null) {
      endWithProtocolError("Protocol error: null bulk in command");
      return;
    }
    parts.push(el.value); // Buffer
  }

  if (parts.length === 0) {
    write(encError("ERR empty command"));
    return;
  }

  const cmd = toUpperAscii(parts[0]);
  const args = parts.slice(1);

  switch (cmd) {
    case "PING": {
      if (args.length === 0) {
        write(encSimple("PONG"));
      } else if (args.length === 1) {
        write(encBulk(args[0]));
      } else {
        write(encError("ERR wrong number of arguments for 'ping' command"));
      }
      return;
    }

    case "ECHO": {
      if (args.length !== 1) {
        write(encError("ERR wrong number of arguments for 'echo' command"));
        return;
      }
      write(encBulk(args[0]));
      return;
    }

    case "SET": {
      if (args.length < 2) {
        write(encError("ERR wrong number of arguments for 'set' command"));
        return;
      }
      const key = args[0].toString("utf8");
      const value = args[1];

      let ttlMs = null;
      if (args.length > 2) {
        if (args.length !== 4) {
          write(encError("ERR syntax error"));
          return;
        }
        const opt = toUpperAscii(args[2]);
        const numStr = args[3].toString("utf8");
        if (!/^\d+$/.test(numStr)) {
          write(encError("ERR value is not an integer or out of range"));
          return;
        }
        const n = Number(numStr);
        if (opt === "EX") ttlMs = n * 1000;
        else if (opt === "PX") ttlMs = n;
        else {
          write(encError("ERR syntax error"));
          return;
        }
      }

      storage.set(key, value, ttlMs);
      write(encSimple("OK"));
      return;
    }

    case "GET": {
      if (args.length !== 1) {
        write(encError("ERR wrong number of arguments for 'get' command"));
        return;
      }
      const key = args[0].toString("utf8");
      const value = storage.get(key);
      if (value === null) {
        write(encBulk(null)); // Null bulk
      } else {
        write(encBulk(value));
      }
      return;
    }

    default: {
      write(encError(`ERR unknown command '${cmd.toLowerCase()}'`));
      return;
    }
  }
}

module.exports = { handleCommand };