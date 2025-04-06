import { CACHE_CONFIG } from '../config/config.js';

class Cache {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
    }

    set(key, value) {
        if (this.cache.size >= CACHE_CONFIG.MAX_ITEMS) {
            this._removeOldest();
        }
        
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now());
    }

    get(key) {
        const timestamp = this.timestamps.get(key);
        if (!timestamp) return null;

        const age = Date.now() - timestamp;
        if (age > CACHE_CONFIG.TTL) {
            this.delete(key);
            return null;
        }

        return this.cache.get(key);
    }

    delete(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
    }

    _removeOldest() {
        let oldestKey = null;
        let oldestTimestamp = Infinity;

        for (const [key, timestamp] of this.timestamps.entries()) {
            if (timestamp < oldestTimestamp) {
                oldestTimestamp = timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    clear() {
        this.cache.clear();
        this.timestamps.clear();
    }
}

export const cache = new Cache(); 