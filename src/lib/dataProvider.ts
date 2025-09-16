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

console.log(`[DataProvider] Initialized with ${useCms ? 'Maccms' : 'Douban'} provider.`);

// --- Re-export all methods from the selected provider ---
// This ensures that UI components can import them directly from this file.
export const getMovies = provider.getMovies;
export const getTvShows = provider.getTvShows;
export const getVarietyShows = provider.getVarietyShows;
export const getAnimes = provider.getAnimes;
export const getShortVideos = provider.getShortVideos;
export const search = provider.search;
export const getCategories = provider.getCategories;
export const getListByTag = provider.getListByTag;
export const getRecommendations = provider.getRecommendations;

/**
 * Facade function for fetching all homepage data.
 * It simplifies the call for the UI layer.
 */
export async function getHomePageData(): Promise<HomePageData> {
  if (provider.getHomePageData) {
    try {
      return await provider.getHomePageData();
    } catch (error) {
      console.warn('[DataProvider] Provider-level batch API failed, falling back.', error);
    }
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

function handleProviderError(categoryName: string, fallbackData: any) {
  return (error: any) => {
    console.error(`[DataProvider] Failed to fetch ${categoryName}:`, error);
    return fallbackData;
  };
}