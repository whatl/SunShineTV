
// lib/providers/maccms.provider.ts

/**
 * @file Implements the DataProvider interface for the Maccms (Apple CMS) data source.
 */

import { CategoriesParams, DataProvider, ListByTagParams, RecommendationsParams } from './interface';
import { BangumiCalendarData } from '../bangumi.client';
import { DoubanResult, SearchResult } from '../types';

const NOT_IMPLEMENTED_ERROR = 'Maccms provider API endpoint is not yet implemented for this method.';

async function fetchFromCmsApi(endpoint: string, params?: Record<string, string>): Promise<any> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from CMS API: ${response.statusText}`);
  }
  return response.json();
}

// --- New Generic Method Implementations ---

// Helper to ensure all items have a consistent, top-level 'rate' property as a string.
const normalizeRateInResult = (result: DoubanResult): DoubanResult => {
  if (result && result.list) {
    result.list = result.list.map(item => ({
      ...item,
      rate: (item.rate || '0').toString(),
    }));
  }
  return result;
};

async function getHomePageData(): Promise<HomePageData> {
  console.log('[MaccmsProvider] getHomePageData called');
  const homeData = await fetchFromCmsApi('/api/cms/shine/home');

  // Normalize rate for all categories that use the standard VideoCard
  if (homeData.movies) {
    homeData.movies = normalizeRateInResult(homeData.movies);
  }
  if (homeData.tvShows) {
    homeData.tvShows = normalizeRateInResult(homeData.tvShows);
  }
  if (homeData.varietyShows) {
    homeData.varietyShows = normalizeRateInResult(homeData.varietyShows);
  }

  // The API returns a DoubanResult for animes, but the UI expects BangumiCalendarData[].
  // We must transform it, just like the old getAnimes() function did.
  if (homeData.animes && homeData.animes.list) {
    const animeResult: DoubanResult = homeData.animes;
    const specialCalendarEntry: BangumiCalendarData = {
      weekday: { id: -1, en: 'CMS', cn: 'CMS', ja: 'CMS' },
      items: animeResult.list.map((item: any) => ({
        id: parseInt(item.id, 10),
        name: item.title,
        name_cn: item.title,
        rating: { score: parseFloat(item.rate || '0') }, // This structure is expected by Bangumi cards
        air_date: item.year || '',
        images: { 
          large: item.poster || '', 
          common: item.poster || '', 
          medium: item.poster || '', 
          small: item.poster || '', 
          grid: item.poster || '' 
        },
      })),
    };
    homeData.animes = [specialCalendarEntry];
  }

  return homeData;
}

async function getList(path: string, extra: Record<string, string>, page: number = 1): Promise<DoubanResult> {
  console.log('[MaccmsProvider] getList called with:', { path, extra, page });
  // Maccms is simple: the main category is the first part of the path.
  const category = path.split('/')[0];
  // It doesn't support complex filtering from `extra` yet, so we only pass category and page.
  const result = await fetchFromCmsApi('/api/cms/shine/page', { 
    category: category, 
    page: page.toString()
  });

  return normalizeRateInResult(result);
}

async function search(extra: Record<string, string>, useStream = false): Promise<SearchResult[] | EventSource> {
  const query = extra.search || '';
  if (!query) {
    return Promise.resolve([]);
  }
  // Assuming a search endpoint exists for maccms.
  // This is a placeholder and might need adjustment based on the actual CMS API.
  return fetchFromCmsApi('/api/cms/shine/search', { query });
}


// --- Legacy Method Implementations (kept for compatibility) ---

async function getMovies(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'movie' });
}

async function getTvShows(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'tv' });
}

async function getVarietyShows(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'show' });
}

async function getAnimes(): Promise<BangumiCalendarData[]> {
  const result: DoubanResult = await fetchFromCmsApi('/api/cms/shine/page', { category: 'anime' });
  if (result.code !== 200 || !result.list || result.list.length === 0) {
    return [];
  }

  const specialCalendarEntry: BangumiCalendarData = {
    weekday: { id: -1, en: 'CMS', cn: 'CMS', ja: 'CMS' },
    items: result.list.map((item: any) => ({
      id: parseInt(item.id, 10),
      name: item.title,
      name_cn: item.title,
      rating: { score: parseFloat(item.rate || '0') },
      air_date: item.year || '',
      images: { 
        large: item.poster || '', 
        common: item.poster || '', 
        medium: item.poster || '', 
        small: item.poster || '', 
        grid: item.poster || '' 
      },
    })),
  };
  return [specialCalendarEntry];
}

async function getShortVideos(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'drama' });
}

/** @deprecated */
async function legacySearch(query: string, useStream = false): Promise<SearchResult[] | EventSource> { 
  return search({ search: query }, useStream);
}

/** @deprecated */
async function getCategories(params: CategoriesParams): Promise<DoubanResult> { 
  return getList(params.type, {}, params.pageStart ? params.pageStart / 25 + 1 : 1);
}

/** @deprecated */
async function getListByTag(params: ListByTagParams): Promise<DoubanResult> { 
  throw new Error(NOT_IMPLEMENTED_ERROR); 
}

/** @deprecated */
async function getRecommendations(params: RecommendationsParams): Promise<DoubanResult> {
  const category = params.type || '';
  const page = params.pageStart ? (params.pageStart / 25 + 1) : 1;
  return getList(category, {}, page);
}

export const maccmsProvider: DataProvider = {
  supportedCategories: ['movie', 'tv', 'show', 'anime', 'drama'],

  // New methods
  getHomePageData,
  getList,
  search,

  // Legacy methods
  getMovies,
  getTvShows,
  getVarietyShows,
  getAnimes,
  getShortVideos,
  getCategories,
  getListByTag,
  getRecommendations,
};