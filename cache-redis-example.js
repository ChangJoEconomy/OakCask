// Redis 캐싱 (선택사항 - 더 고급 캐싱)
const redis = require('redis');

class RedisCache {
    constructor() {
        this.client = redis.createClient();
        this.client.on('error', (err) => console.log('Redis Client Error', err));
    }

    async connect() {
        await this.client.connect();
    }

    async set(key, value, ttl = 1800) { // 30분
        await this.client.setEx(key, ttl, JSON.stringify(value));
    }

    async get(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    async del(key) {
        await this.client.del(key);
    }
}

// 사용법:
// const cache = new RedisCache();
// await cache.connect();
// await cache.set('whiskey_data', whiskeys, 1800);
// const cachedData = await cache.get('whiskey_data');
