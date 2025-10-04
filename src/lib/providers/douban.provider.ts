
// lib/providers/douban.provider.ts

/**
 * @file Implements the DataProvider interface for the Douban data source.
 */

import { CategoriesParams, DataProvider, ListByTagParams, RecommendationsParams } from './interface';
import { BangumiCalendarData, GetBangumiCalendarData } from '../bangumi.client';
import { getDoubanCategories, getDoubanList, getDoubanRecommends } from '../douban.client';
import { DoubanResult, SearchResult } from '../types';

// --- Helper function to map path and extra to legacy params ---

const mapToLegacyParams = (path: string, extra: Record<string, string>, page = 1) => {
  const [type, primaryFromUi] = path.split('/');
  const secondaryFromUi = extra.category as string || 'all';
  const pageLimit = 25;
  const pageStart = (page - 1) * pageLimit;

  // --- Translation Layer ---

  // 1. Primary Selection Translation
  const primaryTranslations: Record<string, string> = {
    'hot': '热门',
    'latest': '最新',
    'top_rated': '豆瓣高分',
    'unpopular': '冷门佳片',
    'all': '全部',
  };
  if (type === 'tv' || type === 'show') {
    primaryTranslations['hot'] = '最近热门';
  }
  const primary = primaryTranslations[primaryFromUi] || primaryFromUi;

  // 2. Secondary Selection Translation (Context-Aware)
  let secondary = '';
  if (type === 'show') {
    const map: Record<string, string> = { 'all': 'show', 'domestic': 'show_domestic', 'foreign': 'show_foreign' };
    secondary = map[secondaryFromUi] || secondaryFromUi;
  } else if (type === 'tv') {
    const map: Record<string, string> = { 'all': 'tv', 'domestic': 'tv_domestic', 'american': 'tv_american', 'japanese': 'tv_japanese', 'korean': 'tv_korean', 'animation': 'tv_animation', 'documentary': 'tv_documentary' };
    secondary = map[secondaryFromUi] || secondaryFromUi;
  } else { // Default for movie and others
    const map: Record<string, string> = { 'all': '全部', 'chinese': '华语', 'western': '欧美', 'korean': '韩国', 'japanese': '日本' };
    secondary = map[secondaryFromUi] || secondaryFromUi;
  }

  // --- Parameter Assembly ---

  // Handle search specifically
  if (type === 'search' && extra.search) {
    return { query: extra.search };
  }

  // Anime special handling
  if (type === 'anime') {
    const animePrimaryMap: Record<string, string> = { 'daily': '每日放送', 'fanju': '番剧', 'movie': '剧场版' };
    const translatedPrimary = animePrimaryMap[primaryFromUi] || primaryFromUi;

    if (translatedPrimary === '每日放送') {
      return { special: 'bangumi_daily', weekday: extra.weekday };
    }
    return {
      type: 'anime',
      kind: translatedPrimary === '番剧' ? 'tv' : 'movie',
      category: '动画',
      format: translatedPrimary === '番剧' ? '电视剧' : '',
      region: extra.region || '',
      year: extra.year || '',
      platform: extra.platform || '',
      sort: extra.sort || 'T',
      label: extra.label || '',
      pageLimit,
      pageStart,
    };
  }

  // Logic for movie, tv, show when '全部' is selected at the primary level
  if (primary === '全部') {
    return {
      type: type,
      kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'),
      category: extra.type || '',
      format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '',
      region: extra.region || '',
      year: extra.year || '',
      platform: extra.platform || '',
      sort: extra.sort || 'T',
      label: extra.label || '',
      pageLimit,
      pageStart,
    };
  }

  // Default mapping for categories (e.g., movie/热门/华语)
  return {
    kind: (type === 'tv' || type === 'show') ? 'tv' : type as 'tv' | 'movie',
    category: primary,
    type: secondary,
    pageLimit,
    pageStart,
  };
};


// --- New Generic Method Implementations ---

async function getList(path: string, extra: Record<string, string>, page = 1): Promise<DoubanResult> {
  let mPath = path;
  if (!mPath.includes('/')) {
      mPath = `${mPath}/all`; // 不包含斜杠时，追加 /all
  }
  const params = mapToLegacyParams(mPath, extra, page);

  if ('special' in params && params.special === 'bangumi_daily') {
    const calendarData = await GetBangumiCalendarData();
    const weekdayData = calendarData.find(
      (item) => item.weekday?.en === params.weekday
    );
    if (weekdayData) {
      return {
        code: 200,
        message: 'success',
        list: weekdayData.items.map((item) => ({
          id: item.id?.toString() || '',
          title: item.name_cn || item.name,
          poster: item.images.large || item.images.common || item.images.medium || item.images.small || item.images.grid,
          rate: item.rating?.score?.toFixed(1) || '',
          year: item.air_date?.split('-')?.[0] || '',
        })),
      };
    } else {
      return { code: 404, message: 'Weekday not found', list: [] };
    }
  }

  const [type, primary] = mPath.split('/');

  if (type === 'anime' || primary === 'all') {
    return getDoubanRecommends(params as RecommendationsParams);
  }

  return getDoubanCategories(params as CategoriesParams);
}

async function search(extra: Record<string, string>, useStream = false, page?: number): Promise<SearchResult[] | EventSource> {
  const mPage = page || 1
  if (mPage > 1) {
    return Promise.resolve([]);
  }
  const query = extra.search || '';
  if (!query) {
    return Promise.resolve([]);
  }
  const url = useStream ? `/api/search/ws?q=${encodeURIComponent(query)}` : `/api/search?q=${encodeURIComponent(query)}`;
  if (useStream) {
    return new EventSource(url);
  } else {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  }
}

async function focusedSearch(params: { q: string; source?: string; id?: string; }): Promise<SearchResult[]> {
  const { q } = params;
  if (!q) {
    return Promise.resolve([]);
  }
  const response = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.results || [];
}

async function detail(params: { id: string; source: string; }): Promise<SearchResult | null> {
  const { id, source } = params;
  if (!id || !source) {
    return Promise.resolve(null);
  }
  const response = await fetch(`/api/detail?source=${source}&id=${id}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}


// --- Legacy Method Implementations (kept for compatibility) ---

async function getMovies(): Promise<DoubanResult> {
  return getDoubanCategories({ kind: 'movie', category: '热门', type: '全部' });
}

async function getTvShows(): Promise<DoubanResult> {
  return getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' });
}

async function getVarietyShows(): Promise<DoubanResult> {
  return getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' });
}

async function getAnimes(): Promise<BangumiCalendarData[]> {
  return GetBangumiCalendarData();
}

async function getShortVideos(): Promise<DoubanResult> {
  return Promise.resolve({ code: 200, message: 'Success', list: [] });
}

async function getCategories(params: CategoriesParams): Promise<DoubanResult> {
  return getDoubanCategories(params);
}

async function getListByTag(params: ListByTagParams): Promise<DoubanResult> {
  return getDoubanList(params);
}

async function getRecommendations(params: RecommendationsParams): Promise<DoubanResult> {
  return getDoubanRecommends(params);
}

// --- Feedback Methods (Not Implemented) ---

async function getCaptcha(_oldSessionId?: string): Promise<{ sessionId: string; imageBase64: string }> {
  throw new Error('Captcha is not available for douban data source');
}

async function submitFeedback(
  _type: number,
  _content: string,
  _sessionId: string,
  _captchaAnswer: string,
  _email?: string
): Promise<{ code: number; message: string }> {
  throw new Error('Feedback submission is not available for douban data source');
}

/**
 * 获取搜索建议
 * 对于豆瓣，直接调用 /api/search/suggestions 接口
 * @param query 搜索查询，空字符串返回空数组（豆瓣不提供热搜）
 */
async function getSuggestions(query: string): Promise<Array<{
  text: string;
  type: 'exact' | 'related' | 'suggestion';
  score?: number;
}>> {
  if (!query) {
    // 豆瓣不提供热搜功能
    return [];
  }

  try {
    const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      console.error('Failed to fetch suggestions');
      return [];
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

// --- Provider Export ---

export const doubanProvider: DataProvider = {
  supportedCategories: ['movie', 'tv', 'show', 'anime'],

  // New methods
  getList,
  search,
  focusedSearch,
  detail,
  getSuggestions,

  // Feedback methods
  getCaptcha,
  submitFeedback,

  // Legacy methods for homepage and direct calls
  getMovies,
  getTvShows,
  getVarietyShows,
  getAnimes,
  getShortVideos,
  getCategories,
  getListByTag,
  getRecommendations,
};