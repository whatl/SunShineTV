
// src/lib/source.utils.ts

/**
 *  配置资源站对应的名称
 */

// Defines the mapping from source keys (used in code) to human-readable names (for UI).
const sourceNameMap = new Map<string, string>([
  ['dbm3u8', ''],
  ['vwnet', '测试站蓝光'],
  ['aiappslys', '测试站Ai'],
  ['YYNB', '测试站NB'],
  ['ruyi', '如意'],
]);

/**
 * Retrieves the human-readable name for a given source key.
 *
 * @param key The source key (e.g., 'ali').
 * @returns The corresponding source name (e.g., '阿里'), or the key itself if not found.
 */
export function getSourceNameByKey(key: string): string {
  return sourceNameMap.get(key) || '';
}

/**
 * Provides the complete map of source keys to names.
 * Useful for generating filter options or other UI elements.
 *
 * @returns The Map object containing all source key-name pairs.
 */
export function getAllSourceNames(): Map<string, string> {
  return sourceNameMap;
}
