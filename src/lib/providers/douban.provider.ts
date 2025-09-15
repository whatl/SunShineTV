// lib/providers/douban.provider.ts

/**
 * @file Implements the DataProvider interface for the Douban data source.
 */

import { BangumiCalendarData, GetBangumiCalendarData } from '../bangumi.client';
import { getDoubanCategories, getDoubanList, getDoubanRecommends } from '../douban.client';
import { DoubanResult, SearchResult } from '../types';
import { CategoriesParams, DataProvider, ListByTagParams, RecommendationsParams } from './interface';

// --- Method Implementations ---

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

async function search(query: string, useStream = false): Promise<SearchResult[] | EventSource> {
  const url = useStream ? `/api/search/ws?q=${encodeURIComponent(query)}` : `/api/search?q=${encodeURIComponent(query)}`;
  if (useStream) {
    return new EventSource(url);
  } else {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  }
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

// --- Provider Export ---
// This object bundles all method implementations and strictly adheres to the DataProvider interface.
export const doubanProvider: DataProvider = {
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