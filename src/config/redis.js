const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => console.error('Redis Client Error', err));

async function ensureConnected() {
  if (!redis.isOpen) await redis.connect();
}

module.exports = { redis, ensureConnected };
