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
    const errorText = await response.text();
    throw new Error(`Failed to fetch from CMS API: ${response.statusText}`);
  }
  return response.json();
}

// --- Method Implementations ---

// This provider does not have a batch endpoint, so this method is not implemented.
// The central dataProvider will fall back to individual methods.

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

  // Perfectly disguise the flat list from CMS into the BangumiCalendarData[] structure
  // with the special `-1` signal, so the UI layer doesn't need to change.
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

async function search(query: string, useStream = false): Promise<SearchResult[] | EventSource> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getCategories(params: CategoriesParams): Promise<DoubanResult> { return fetchFromCmsApi('/api/cms/shine/page', { category: params.type, page: params.pageStart?.toString() || '0' }); }
async function getListByTag(params: ListByTagParams): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getRecommendations(params: RecommendationsParams): Promise<DoubanResult> {
  // This is a specific workaround to handle the logic from `douban/page.tsx`.
  // The UI uses 'getRecommendations' for anime sub-types, passing `category: '动画'`.
  // We detect this to ensure we query our CMS API with the correct 'anime' category.
  const category = params.type;
  // if (params.category === '动画') {
  //   category = 'anime';
  // }

  const page = params.pageStart ? (params.pageStart / 25 + 1).toString() : '1';
  return fetchFromCmsApi('/api/cms/shine/page', { 
    category: category, 
    page: page
  });
}

export const maccmsProvider: DataProvider = {
  // getHomePageData is not implemented, so the central dispatcher will use individual methods.
  getMovies,
  getTvShows,
  getVarietyShows,
  getAnimes,
  getShortVideos,
  search,
  getCategories,
  getListByTag,
  getRecommendations,
};