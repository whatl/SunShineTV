
// lib/dataProvider.ts

/**
 * @file Central dispatcher for all data fetching.
 * It selects the provider based on environment configuration and exports its methods.
 */

import { doubanProvider } from './providers/douban.provider';
import { DataProvider, HomePageData } from './providers/interface';
import { maccmsProvider } from './providers/maccms.provider';

const useCms = process.env.NEXT_PUBLIC_DATA_SOURCE === 'maccms';
const provider: DataProvider = useCms ? maccmsProvider : doubanProvider;

// --- Re-export all methods from the selected provider ---

// New generic methods
export const getList = provider.getList;
export const search = provider.search;
export const focusedSearch = provider.focusedSearch;
export const detail = provider.detail;
export const supportedCategories = provider.supportedCategories;
export const getSuggestions = provider.getSuggestions || (async () => []);

// Feedback methods (optional, may throw if not supported by provider)
export const getCaptcha = provider.getCaptcha;
export const submitFeedback = provider.submitFeedback;
export const decodeUrl = provider.decodeUrl;

// Legacy methods (for homepage, etc.)
export const getMovies = provider.getMovies;
export const getTvShows = provider.getTvShows;
export const getVarietyShows = provider.getVarietyShows;
export const getAnimes = provider.getAnimes;
export const getShortVideos = provider.getShortVideos;

// Deprecated methods (to be phased out)
/** @deprecated */
export const getCategories = provider.getCategories;
/** @deprecated */
export const getListByTag = provider.getListByTag;
/** @deprecated */
export const getRecommendations = provider.getRecommendations;


/**
 * Facade function for fetching all homepage data.
 * It simplifies the call for the UI layer.
 */
export async function getHomePageData(): Promise<HomePageData> {
  if (provider.getHomePageData) {
    return await provider.getHomePageData();
  }

  const [movies, tvShows, varietyShows, animes, shortVideos] = await Promise.all([
    getMovies().catch(handleProviderError('Movies', { code: 500, message: 'Fallback', list: [] })),
    getTvShows().catch(handleProviderError('TV Shows', { code: 500, message: 'Fallback', list: [] })),
    getVarietyShows().catch(handleProviderError('Variety Shows', { code: 500, message: 'Fallback', list: [] })),
    getAnimes().catch(handleProviderError('Animes', [])),
    getShortVideos().catch(handleProviderError('Short Videos', { code: 500, message: 'Fallback', list: [] })),
  ]);

  return { movies, tvShows, varietyShows, animes, shortVideos };
}


function handleProviderError<T>(categoryName: string, fallbackData: T) {
  return (_error: Error): T => {
    // console.error(`[DataProvider] Failed to fetch ${categoryName}:`, error);
    return fallbackData;
  };
}
