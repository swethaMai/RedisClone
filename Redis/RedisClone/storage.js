// storage.js
// In-memory key-value store with lazy expiration.
// Values are Buffers for binary safety.

const store = new Map(); // key -> { value: Buffer, expiresAt: number|null }

function now() { return Date.now(); }

/** Internal: returns true if key exists and not expired; deletes if expired. */
function isAlive(key) {
  const rec = store.get(key);
  if (!rec) return false;
  if (rec.expiresAt !== null && now() >= rec.expiresAt) {
    store.delete(key);
    return false;
  }
  return true;
}

/** Set key to value (Buffer or string), optional ttlMs (number|null). */
function set(key, value, ttlMs = null) {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  const expiresAt = ttlMs !== null ? now() + ttlMs : null;
  store.set(key, { value: buf, expiresAt });
}

/** Get value Buffer, or null if missing/expired. */
function get(key) {
  if (!isAlive(key)) return null;
  return store.get(key).value;
}

/** Delete a key. Returns 1 if deleted, 0 if not found. */
function del(key) {
  return store.delete(key) ? 1 : 0;
}

/** Check existence (0/1) with lazy expiry. */
function exists(key) {
  return isAlive(key) ? 1 : 0;
}

/** Optional maintenance: remove expired keys periodically. */
function cleanup() {
  const t = now();
  for (const [k, rec] of store) {
    if (rec.expiresAt !== null && t >= rec.expiresAt) store.delete(k);
  }
}

module.exports = {
  set,
  get,
  del,
  exists,
  cleanup,
};