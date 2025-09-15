// lib/providers/maccms.provider.ts

/**
 * @file Placeholder implementation for the Maccms data source.
 * All methods throw a `Not Implemented` error, ensuring type safety during development.
 */

import { BangumiCalendarData } from '../bangumi.client';
import { DoubanResult, SearchResult } from '../types';
import { CategoriesParams, DataProvider, HomePageData, ListByTagParams, RecommendationsParams } from './interface';

const NOT_IMPLEMENTED_ERROR = 'Maccms provider is not yet implemented.';

// --- Placeholder Implementations ---

async function getHomePageData(): Promise<HomePageData> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getMovies(): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getTvShows(): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getVarietyShows(): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getAnimes(): Promise<BangumiCalendarData[]> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getShortVideos(): Promise<DoubanResult> { return Promise.resolve({ code: 200, message: 'Success', list: [] }); }
async function search(query: string, useStream?: boolean): Promise<SearchResult[] | EventSource> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getCategories(params: CategoriesParams): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getListByTag(params: ListByTagParams): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }
async function getRecommendations(params: RecommendationsParams): Promise<DoubanResult> { throw new Error(NOT_IMPLEMENTED_ERROR); }

// --- Provider Export ---
export const maccmsProvider: DataProvider = {
  getHomePageData,
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