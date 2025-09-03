const { ensureConnected, redis } = require('../config/redis');

async function cacheGet(key) {
  try {
    await ensureConnected();
    const val = await redis.get(key);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return null; }
  } catch (e) {
    // Fallback: cache miss on error
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 30) {
  try {
    await ensureConnected();
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (e) {
    // Ignore errors when Redis isn't available
  }
}

module.exports = { cacheGet, cacheSet };
