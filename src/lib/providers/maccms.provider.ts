// lib/providers/maccms.provider.ts

/**
 * @file Implements the DataProvider interface for the Maccms (Apple CMS) data source.
 */

import { CategoriesParams, DataProvider, HomePageData, ListByTagParams, RecommendationsParams } from './interface';
import { BangumiCalendarData } from '../bangumi.client';
import { DoubanItem, DoubanResult, SearchResult } from '../types';

const NOT_IMPLEMENTED_ERROR = 'Maccms provider API endpoint is not yet implemented for this method.';

// This is the actual shape of the data returned by the CMS home API.
interface CmsHomePageApiResponse {
  movies: DoubanResult;
  tvShows: DoubanResult;
  varietyShows: DoubanResult;
  animes: DoubanResult;
  shortVideos: DoubanResult;
}

async function fetchFromCmsApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
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
  return response.json() as Promise<T>;
}

// --- New Generic Method Implementations ---

// Helper to ensure all items have a consistent, top-level 'rate' property as a string.
const normalizeRateInResult = (result: DoubanResult): DoubanResult => {
  if (result && result.list) {
    result.list = result.list.map((item: DoubanItem) => ({
      ...item,
      rate: (item.rate || '0').toString(),
    }));
  }
  return result;
};

async function getHomePageData(): Promise<HomePageData> {
  const homeData = await fetchFromCmsApi<CmsHomePageApiResponse>('/api/cms/shine/home');

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
  let transformedAnimes: BangumiCalendarData[] = [];
  if (homeData.animes && homeData.animes.list) {
    const animeResult: DoubanResult = homeData.animes;
    const specialCalendarEntry: BangumiCalendarData = {
      weekday: {  en: 'CMS' },
      items: animeResult.list.map((item: DoubanItem) => ({
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
    transformedAnimes = [specialCalendarEntry];
  }

  return { ...homeData, animes: transformedAnimes };
}

async function getList(path: string, extra: Record<string, string>, page = 1): Promise<DoubanResult> {
  const category = path.split('/')[0];
  const result = await fetchFromCmsApi<DoubanResult>('/api/cms/shine/page', { 
    category: category, 
    page: page.toString()
  });
  return normalizeRateInResult(result);
}

async function search(extra: Record<string, string>): Promise<SearchResult[] | EventSource> {
  const query = extra.search || '';
  if (!query) {
    return Promise.resolve([]);
  }
  return fetchFromCmsApi('/api/cms/shine/search', { q: query });
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
    weekday: {  en: 'CMS'},
    items: result.list.map((item: DoubanItem) => ({
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
async function getCategories({ type, pageStart }: CategoriesParams): Promise<DoubanResult> { 
  return getList(type, {}, pageStart ? pageStart / 25 + 1 : 1);
}

/** @deprecated */
async function getListByTag(_params: ListByTagParams): Promise<DoubanResult> { 
  throw new Error(NOT_IMPLEMENTED_ERROR); 
}

/** @deprecated */
async function getRecommendations({ type, pageStart }: RecommendationsParams): Promise<DoubanResult> {
  const category = type || '';
  const page = pageStart ? (pageStart / 25 + 1) : 1;
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