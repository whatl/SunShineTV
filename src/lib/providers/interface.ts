
// lib/providers/interface.ts

/**
 * @file Defines the universal interfaces for data fetching across the entire application.
 * This file establishes a contract that all data source providers must adhere to.
 */

import { BangumiCalendarData } from '../bangumi.client';
import { DoubanResult, SearchResult } from '../types';

// =================================================================================
// DEPRECATED AND EXISTING TYPES
// =================================================================================

/** @deprecated Will be replaced by the new generic `getList` method. */
export interface CategoriesParams { kind: 'tv' | 'movie'; category: string; type: string; pageLimit?: number; pageStart?: number; }
/** @deprecated Will be replaced by the new generic `getList` method. */
export interface ListByTagParams { tag: string; type: string; pageLimit?: number; pageStart?: number; }
/** @deprecated Will be replaced by the new generic `getList` method. */
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
  /**
   * A list of top-level category keys that this provider supports.
   * E.g., ['movie', 'tv', 'anime', 'show']
   */
  supportedCategories: string[];

  // Optional batch fetch for homepage, for performance optimization.
  getHomePageData?: () => Promise<HomePageData>;

  // Individual methods for homepage sections
  getMovies: () => Promise<DoubanResult>;
  getTvShows: () => Promise<DoubanResult>;
  getVarietyShows: () => Promise<DoubanResult>;
  getAnimes: () => Promise<BangumiCalendarData[]>;
  getShortVideos: () => Promise<DoubanResult>;

  /**
   * Fetches a list of items based on a generic path and extra filters.
   * @param path The hierarchical path for the request (e.g., "tv/all" or "anime/fanju").
   * @param extra A map of additional key-value filters (e.g., { region: "US", year: "2023" }).
   * @param page The page number for pagination (default is 1).
   * @returns A promise that resolves to a list of results.
   */
  getList: (path: string, extra: Record<string, string>, page?: number) => Promise<DoubanResult>;

  /**
   * Performs a search using a set of filters.
   * @param extra A map of search filters. Must include a `search` key for the query string.
   * @param useStream Optional flag to enable streaming results.
   * @returns A promise that resolves to search results or an EventSource for streaming.
   */
  search: (extra: Record<string, string>, useStream?: boolean) => Promise<SearchResult[] | EventSource>;

  /**
   * Performs a broad search for a resource, potentially using context like source and id to refine.
   * @param params An object containing the search query and optional context.
   * @returns A promise that resolves to a list of search results.
   */
  focusedSearch: (params: { q: string; source?: string; id?: string; }) => Promise<SearchResult[]>;

  /**
   * Fetches a single, specific resource by its source and ID.
   * @param params An object containing the unique identifiers for the resource.
   * @returns A promise that resolves to the detailed search result, or null if not found.
   */
  detail: (params: { id: string; source: string; }) => Promise<SearchResult | null>;


  // =================================================================================
  // DEPRECATED METHODS - Will be removed in a future version
  // =================================================================================

  /**
   * @deprecated Please use `getList` instead.
   */
  getCategories: (params: CategoriesParams) => Promise<DoubanResult>;
  /**
   * @deprecated Please use `getList` instead.
   */
  getListByTag: (params: ListByTagParams) => Promise<DoubanResult>;
  /**
   * @deprecated Please use `getList` instead.
   */
  getRecommendations: (params: RecommendationsParams) => Promise<DoubanResult>;
}
