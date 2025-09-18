// lib/providers/maccms.provider.ts

/**
 * @file Implements the DataProvider interface for the Maccms (Apple CMS) data source.
 */
import protobuf from 'protobufjs';

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

let protoRoot: protobuf.Root | null = null;
async function getProtoRoot(): Promise<protobuf.Root> {
  if (protoRoot) {
    return protoRoot;
  }
  const protoDefinition = `
  syntax = "proto3";

  package maccms;

  message DoubanItem {
    string id = 1;
    string title = 2;
    string poster = 3;
    string rate = 4;
    string year = 5;
    string remarks = 6;
  }

  message DoubanResult {
    int32 code = 1;
    string message = 2;
    repeated DoubanItem list = 3;
  }

  message SearchResult {
    string id = 1;
    string title = 2;
    string poster = 3;
    repeated string episodes = 4;
    repeated string episodes_titles = 5;
    string source = 6;
    string source_name = 7;
    string class = 8;
    string year = 9;
    string desc = 10;
    string type_name = 11;
    int32 douban_id = 12;
  }

  message SearchResultList {
      repeated SearchResult results = 1;
  }

  message CmsHomePageApiResponse {
    DoubanResult movies = 1;
    DoubanResult tvShows = 2;
    DoubanResult varietyShows = 3;
    DoubanResult animes = 4;
    DoubanResult shortVideos = 5;
  }
  `;
  protoRoot = protobuf.parse(protoDefinition).root;
  return protoRoot;
}


async function fetchFromCmsApi<T>(endpoint: string, params?: Record<string, string>, protoTypeName?: string): Promise<T> {
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

  const contentType = response.headers.get('Content-Type');
  if (protoTypeName && contentType && contentType.includes('application/x-protobuf')) {
    const buffer = await response.arrayBuffer();
    const root = await getProtoRoot();
    const MessageType = root.lookupType(protoTypeName);
    const decodedMessage = MessageType.decode(new Uint8Array(buffer));
    return MessageType.toObject(decodedMessage, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
    }) as T;
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
  const homeData = await fetchFromCmsApi<CmsHomePageApiResponse>('/api/cms/shine/home', undefined, 'maccms.CmsHomePageApiResponse');

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
  }, 'maccms.DoubanResult');
  return normalizeRateInResult(result);
}

async function search(extra: Record<string, string>): Promise<SearchResult[] | EventSource> {
  const query = extra.search || '';
  if (!query) {
    return Promise.resolve([]);
  }
  const response = await fetchFromCmsApi<SearchResult[] | { results: SearchResult[] }>('/api/cms/shine/search', { q: query }, 'maccms.SearchResultList');

  if (Array.isArray(response)) {
    return response;
  } else if (response && Array.isArray(response.results)) {
    return response.results;
  }
  return [];
}


// --- Legacy Method Implementations (kept for compatibility) ---

async function getMovies(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'movie' }, 'maccms.DoubanResult');
}

async function getTvShows(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'tv' }, 'maccms.DoubanResult');
}

async function getVarietyShows(): Promise<DoubanResult> {
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'show' }, 'maccms.DoubanResult');
}

async function getAnimes(): Promise<BangumiCalendarData[]> {
  const result: DoubanResult = await fetchFromCmsApi('/api/cms/shine/page', { category: 'anime' }, 'maccms.DoubanResult');
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
  return fetchFromCmsApi('/api/cms/shine/page', { category: 'drama' }, 'maccms.DoubanResult');
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
