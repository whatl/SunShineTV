/**
 * 侧边栏激活状态辅助函数
 *
 * 使用数字 ID 映射侧边栏状态：
 * 1=首页, 2=搜索, 3=电影, 4=剧集, 5=动漫, 6=综艺, 7=短剧, 8=自定义, 9=直播
 */

/**
 * 获取当前页面对应的侧边栏 ID
 */
export function getSidebarId(): number | null {
  if (typeof window === 'undefined') return null;

  const pathname = window.location.pathname;
  const search = window.location.search;
  const fullPath = pathname + search;

  // 使用包含匹配，灵活处理各种查询参数
  if (pathname === '/' && search === '') return 1;  // 首页精确匹配
  if (fullPath.includes('/search')) return 2;
  if (fullPath.includes('type=movie')) return 3;
  if (fullPath.includes('type=tv')) return 4;
  if (fullPath.includes('type=anime')) return 5;
  if (fullPath.includes('type=show')) return 6;
  if (fullPath.includes('type=drama')) return 7;
  if (fullPath.includes('type=custom')) return 8;
  if (fullPath.includes('/live')) return 9;

  return null;
}

/**
 * 给 URL 添加 as 参数（放在最前面）
 * @param url 原始 URL
 * @returns 添加了 as 参数的 URL（as 参数在最前面）
 */
export function addBaseParam(url: string): string {
  const sidebarId = getSidebarId();
  if (!sidebarId) return url;

  // 找到第一个 ? 的位置
  const queryIndex = url.indexOf('?');

  // 如果 URL 没有查询参数，直接添加
  if (queryIndex === -1) {
    return `${url}?as=${sidebarId}`;
  }

  // 如果有查询参数，将 as 放在最前面（只在第一个 ? 处分割）
  const path = url.substring(0, queryIndex);
  const query = url.substring(queryIndex + 1);
  return `${path}?as=${sidebarId}&${query}`;
}

/**
 * 导航到指定 URL，自动带上 as 参数
 * @param url 目标 URL
 */
export function navigateWithSidebar(url: string): void {
  const finalUrl = addBaseParam(url);
  window.location.href = finalUrl;
}
