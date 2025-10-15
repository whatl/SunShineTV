/**
 * 内存缓存工具
 * 仅在客户端内存中缓存数据，刷新页面后失效
 */

// 内存缓存对象
const memoryCache = new Map<string, unknown>();

/**
 * 设置缓存
 */
export function setCache<T>(key: string, data: T): void {
  memoryCache.set(key, data);
}

/**
 * 获取缓存
 */
export function getCache<T>(key: string): T | null {
  const value = memoryCache.get(key);
  return value !== undefined ? (value as T) : null;
}

/**
 * 清除指定缓存
 */
export function clearCache(key: string): void {
  memoryCache.delete(key);
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  memoryCache.clear();
}
