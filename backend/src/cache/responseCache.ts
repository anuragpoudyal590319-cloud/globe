import { LRUCache } from 'lru-cache';

// TTL values in milliseconds
const TTL_COUNTRIES = 60 * 60 * 1000; // 1 hour
const TTL_INDICATORS = 10 * 60 * 1000; // 10 minutes
const TTL_META = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
}

class ResponseCache {
  private cache: LRUCache<string, CacheEntry<unknown>>;

  constructor() {
    this.cache = new LRUCache({
      max: 100,
      ttl: TTL_INDICATORS, // default TTL
      allowStale: false,
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    return entry?.data;
  }

  set<T>(key: string, data: T, type: 'countries' | 'indicators' | 'meta' = 'indicators'): void {
    let ttl: number;
    switch (type) {
      case 'countries':
        ttl = TTL_COUNTRIES;
        break;
      case 'meta':
        ttl = TTL_META;
        break;
      default:
        ttl = TTL_INDICATORS;
    }
    this.cache.set(key, { data }, { ttl });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      console.log('[Cache] Cleared all entries');
      return;
    }

    // Invalidate keys matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
    console.log(`[Cache] Invalidated entries matching: ${pattern}`);
  }

  invalidateIndicators(): void {
    this.invalidate('indicators');
    this.invalidate('meta');
  }
}

// Singleton instance
export const responseCache = new ResponseCache();

