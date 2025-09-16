
// lib/providers/interface.ts

/**
 * @file Defines the universal interfaces for data fetching across the entire application.
 * This file establishes a contract that all data source providers must adhere to.
 */

import { BangumiCalendarData } from '../bangumi.client';
import { DoubanResult, SearchResult } from '../types';

// Parameter types for provider methods
export interface CategoriesParams { kind: 'tv' | 'movie'; category: string; type: string; pageLimit?: number; pageStart?: number; }
export interface ListByTagParams { tag: string; type: string; pageLimit?: number; pageStart?: number; }
// type 就是来自于哪些大类
export interface RecommendationsParams {type?: string; kind: 'tv' | 'movie'; pageLimit?: number; pageStart?: number; category?: string; format?: string; label?: string; region?: string; year?: string; platform?: string; sort?: string; }

/**
 * Represents the standardized structure for a batch of homepage data.
 */
export interface HomePageData {
  movies: DoubanResult;
  tvShows: DoubanResult;
  varietyShows: DoubanResult;
  animes: BangumiCalendarData[];
  shortVideos: DoubanResult;
}

/**
 * This is the core contract for any data source provider.
 * To add a new data source, one must create an object that implements this interface.
 */
export interface DataProvider {
  // Optional batch fetch for homepage, for performance optimization.
  getHomePageData?: () => Promise<HomePageData>;

  // Individual methods for homepage sections
  getMovies: () => Promise<DoubanResult>;
  getTvShows: () => Promise<DoubanResult>;
  getVarietyShows: () => Promise<DoubanResult>;
  getAnimes: () => Promise<BangumiCalendarData[]>;
  getShortVideos: () => Promise<DoubanResult>;

  // Search method
  search: (query: string, useStream?: boolean) => Promise<SearchResult[] | EventSource>;

  // Methods for category/details pages
  getCategories: (params: CategoriesParams) => Promise<DoubanResult>;
  getListByTag: (params: ListByTagParams) => Promise<DoubanResult>;
  getRecommendations: (params: RecommendationsParams) => Promise<DoubanResult>;
}
