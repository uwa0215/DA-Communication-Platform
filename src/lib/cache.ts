const globalCache = new Map<string, { value: any, expiry: number }>();

/**
 * A lightweight caching mechanism for hyper-optimization.
 * In a fully distributed environment, this should connect to Upstash Redis.
 * For Render, this in-memory cache provides 0ms latency for frequent queries.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  // If UPSTASH_REDIS_REST_URL exists, we would use it here.
  const cached = globalCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiry) {
    globalCache.delete(key);
    return null;
  }
  return cached.value as T;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  const expiry = Date.now() + (ttlSeconds * 1000);
  globalCache.set(key, { value, expiry });
}

export async function invalidateCachePrefix(prefix: string): Promise<void> {
  for (const key of globalCache.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.delete(key);
    }
  }
}
