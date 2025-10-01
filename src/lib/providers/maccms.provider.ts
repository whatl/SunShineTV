// lib/providers/maccms.provider.ts

/**
 * @file Implements the DataProvider interface for the Maccms (Apple CMS) data source.
 */
import protobuf from 'protobufjs';

import { CategoriesParams, DataProvider, HomePageData, ListByTagParams, RecommendationsParams } from './interface';
import { BangumiCalendarData } from '../bangumi.client';
import { API_BASE_URL } from '../maccms.config';
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

// For client-side execution, the proto definition must be a string literal.
// It cannot be read from the filesystem.
let protoRoot: protobuf.Root | null = null;
async function getProtoRoot(): Promise<protobuf.Root> {
  if (protoRoot) {
    return protoRoot;
  }
  const protoDefinition = `
  syntax = "proto3";

  package maccms;

  message DoubanItem {
    string id = 1; // douban_id
    string vodid =2;
    string title = 3;
    string poster = 4;
    string rate = 5;
    string year = 6;
    string remarks = 7;
  }

  message DoubanResult {
    int32 code = 1;
    string message = 2;
    repeated DoubanItem list = 3;
  }

 message SearchResult {
  string id = 1; // vodid
  string title = 2;
  string poster = 3;
  repeated string episodes = 4;
  repeated string episodes_titles = 5;
  int32 episodes_count=6;
  string source = 7;
  string source_name = 8;
  string class = 9;
  string year = 10;
  string desc = 11;
  string type_name = 12;
  int32 douban_id = 13;
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
  let url = `${API_BASE_URL}${endpoint}`;
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
      weekday: { en: 'CMS' },
      items: animeResult.list.map((item: DoubanItem) => ({
        id: parseInt(item.id, 10),
        vodid: item.vodid,
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

// 平衡服务器性能和体验代码（By Faker）
async function optmisePerformance(page: number){
  if ( page <= 1 ) return;
  if ( page <= 3) {
    await new Promise(r => setTimeout(r, 100)); 
    return;
  }
  // 随机睡眠100-600毫秒来减轻服务器压力
  await new Promise(r => setTimeout(r, (page <= 10 ? 100 : 200) + Math.random() * (page <= 10 ? 300 : 400))); 
}

async function getList(path: string, extra: Record<string, string>, page = 1): Promise<DoubanResult> {
  await optmisePerformance(page);
  const category = path.split('/')[0];
  const result = await fetchFromCmsApi<DoubanResult>('/api/cms/shine/page', {
    category: category,
    page: page.toString()
  }, 'maccms.DoubanResult');
  return normalizeRateInResult(result);
}

async function search(extra: Record<string, string>, useStream = false, page = 1): Promise<SearchResult[] | EventSource> {
  // if (page > 1) {
  //   return Promise.resolve([]);
  // }
  const query = extra.search || '';
  if (!query) {
    return Promise.resolve([]);
  }
  await optmisePerformance(page);
  const response = await fetchFromCmsApi<SearchResult[] | { results: SearchResult[] }>('/api/cms/shine/search', { q: query,page:page.toString() }, 'maccms.SearchResultList');

  if (Array.isArray(response)) {
    return response;
  } else if (response && Array.isArray(response.results)) {
    return response.results;
  }
  return [];
}


async function focusedSearch(params: { q: string; source?: string; id?: string; }): Promise<SearchResult[]> {
  const { q, source, id } = params;
  if (!q) {
    return Promise.resolve([]);
  }
  const apiParams: Record<string, string> = { q };
  if (source) {
    apiParams.source = source;
  }
  if (id) {
    apiParams.id = id;
  }
  const response = await fetchFromCmsApi<SearchResult[] | { results: SearchResult[] }>('/api/cms/shine/search/focused', apiParams, 'maccms.SearchResultList');

  if (Array.isArray(response)) {
    return response;
  } else if (response && Array.isArray(response.results)) {
    return response.results;
  }
  return [];
}

async function detail(params: { id: string; source: string; }): Promise<SearchResult | null> {
  const { id, source } = params;
  if (!id) {
    return Promise.resolve(null);
  }
  try {
    // source 对于 maccms 可能不是必须的，但我们仍然传递它以保持接口一致性
    return await fetchFromCmsApi<SearchResult>('/api/cms/shine/detail', { id, source }, 'maccms.SearchResult');
  } catch (error) {
    // 404 等错误会在这里被捕获，返回 null 是符合预期的
    return null;
  }
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
  // 检查是否有错误：code 存在且不是成功状态（0 或 200）
  if (result.code && result.code !== 0 && result.code !== 200) {
    return [];
  }
  // 检查数据是否为空
  if (!result.list || result.list.length === 0) {
    return [];
  }

  const specialCalendarEntry: BangumiCalendarData = {
    weekday: { en: 'CMS' },
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
  focusedSearch,
  detail,

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