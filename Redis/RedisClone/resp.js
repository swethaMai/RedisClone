// resp.js
// RESP2 encoder and streaming decoder for Simple Strings, Errors, Integers,
// Bulk Strings, and Arrays (enough for redis-cli interaction).

// ---------- Encoders ----------
function encSimple(str) { return `+${str}\r\n`; }
function encError(msg) { return `-${msg}\r\n`; }
function encInteger(n) { return `:${n}\r\n`; }
function encBulk(data) {
  if (data === null) return `$-1\r\n`; // Null Bulk String
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  // Use "binary" (latin1) for byte-preserving writes later
  return `$${buf.length}\r\n${buf.toString("binary")}\r\n`;
}
function encArray(arr) {
  if (!Array.isArray(arr)) throw new Error("encArray expects an array");
  let out = `*${arr.length}\r\n`;
  for (const item of arr) {
    if (typeof item === "number") {
      out += encInteger(item);
    } else if (item && item.__type === "simple") {
      out += encSimple(item.value);
    } else if (item && item.__type === "error") {
      out += encError(item.value);
    } else {
      out += encBulk(item);
    }
  }
  return out;
}

// ---------- Decoder (streaming) ----------
/**
 * parseFrame(buf, start=0)
 * Returns:
 *   - { node, nextOffset }
 *   - { needMore: true }
 *   - { protocolError: string }
 *
 * Node shapes:
 *   - { type: 'simple', value: string }
 *   - { type: 'error', value: string }
 *   - { type: 'integer', value: number }
 *   - { type: 'bulk', value: Buffer|null }
 *   - { type: 'array', value: Node[]|null }
 */
function parseFrame(buf, start = 0) {
  if (start >= buf.length) return { needMore: true };

  const prefix = buf[start];
  const CR = 13, LF = 10;

  function readLine(pos) {
    for (let i = pos; i + 1 < buf.length; i++) {
      if (buf[i] === CR && buf[i + 1] === LF) {
        return { line: buf.slice(pos, i).toString("utf8"), next: i + 2 };
      }
    }
    return null; // incomplete
  }

  function parseIntegerLine(s) {
    if (!/^-?\d+$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isSafeInteger(n)) return null;
    return n;
  }

  switch (prefix) {
    case 43: { // '+'
      const r = readLine(start + 1);
      if (!r) return { needMore: true };
      return { node: { type: "simple", value: r.line }, nextOffset: r.next };
    }
    case 45: { // '-'
      const r = readLine(start + 1);
      if (!r) return { needMore: true };
      return { node: { type: "error", value: r.line }, nextOffset: r.next };
    }
    case 58: { // ':'
      const r = readLine(start + 1);
      if (!r) return { needMore: true };
      const n = parseIntegerLine(r.line);
      if (n === null) return { protocolError: "Protocol error: invalid integer" };
      return { node: { type: "integer", value: n }, nextOffset: r.next };
    }
    case 36: { // '$'
      const r = readLine(start + 1);
      if (!r) return { needMore: true };
      const len = parseIntegerLine(r.line);
      if (len === null) return { protocolError: "Protocol error: invalid bulk length" };
      if (len === -1) return { node: { type: "bulk", value: null }, nextOffset: r.next };
      const end = r.next + len + 2;
      if (end > buf.length) return { needMore: true };
      if (buf[r.next + len] !== CR || buf[r.next + len + 1] !== LF) {
        return { protocolError: "Protocol error: invalid bulk payload terminator" };
      }
      const payload = buf.slice(r.next, r.next + len);
      return { node: { type: "bulk", value: payload }, nextOffset: end };
    }
    case 42: { // '*'
      const r = readLine(start + 1);
      if (!r) return { needMore: true };
      const count = parseIntegerLine(r.line);
      if (count === null) return { protocolError: "Protocol error: invalid multibulk length" };
      if (count === -1) return { node: { type: "array", value: null }, nextOffset: r.next };
      let next = r.next;
      const items = [];
      for (let i = 0; i < count; i++) {
        const child = parseFrame(buf, next);
        if (child.needMore) return { needMore: true };
        if (child.protocolError) return child;
        items.push(child.node);
        next = child.nextOffset;
      }
      return { node: { type: "array", value: items }, nextOffset: next };
    }
    default:
      return { protocolError: "Protocol error: invalid first byte" };
  }
}

module.exports = {
  encSimple,
  encError,
  encInteger,
  encBulk,
  encArray,
  parseFrame,
};