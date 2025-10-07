// lib/providers/maccms.provider.ts

/**
 * @file Implements the DataProvider interface for the Maccms (Apple CMS) data source.
 */
import protobuf from 'protobufjs';

import { CategoriesParams, DataProvider, HomePageData, ListByTagParams, RecommendationsParams } from './interface';
import { BangumiCalendarData } from '../bangumi.client';
import { API_BASE_URL } from '../maccms.config';
import {DecodeResponse,DoubanItem, DoubanResult, SearchResult } from '../types';

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
  bool need_decode = 14; // 是否需要解码才能播放
  string quality = 15; // 配置的清晰度
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

  message CommonResponse {
    int32 code = 1;
    string message = 2;
  }

  message CaptchaResponse {
    string sessionId = 1;
    string imageBase64 = 2;
  }

  message DecodeResponse {
    int32 code = 1;
    string msg = 2;
    string data = 3;
  }
  `;
  protoRoot = protobuf.parse(protoDefinition).root;
  return protoRoot;
}


async function fetchFromCmsApi<T>(endpoint: string, params?: Record<string, string>, protoTypeName?: string, signal?: AbortSignal): Promise<T> {
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

  const response = await fetch(url, { signal });

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

// Helper to normalize the response code: if code is missing or 0, set it to 200
const normalizeResponseCode = (result: DoubanResult): DoubanResult => {
  if (!result.code || result.code === 0) {
    result.code = 200;
  }
  return result;
};

async function getHomePageData(): Promise<HomePageData> {
  const homeData = await fetchFromCmsApi<CmsHomePageApiResponse>('/api/cms/shine/home', undefined, 'maccms.CmsHomePageApiResponse');

  // Normalize response code for all categories
  if (homeData.movies) {
    homeData.movies = normalizeResponseCode(homeData.movies);
  }
  if (homeData.tvShows) {
    homeData.tvShows = normalizeResponseCode(homeData.tvShows);
  }
  if (homeData.varietyShows) {
    homeData.varietyShows = normalizeResponseCode(homeData.varietyShows);
  }
  if (homeData.shortVideos) {
    homeData.shortVideos = normalizeResponseCode(homeData.shortVideos);
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
  return normalizeResponseCode(result);
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


/**
 * 聚焦搜索：根据查询词和上下文（source/id/ekey）查找视频播放源
 * @param params.q - 搜索关键词
 * @param params.source - 播放源名称（本地视频）
 * @param params.id - 视频ID（本地或站外）
 * @param params.ekey - 站外数据站标识（与id配对使用，ekey+id唯一标识一个站外视频）
 */
async function focusedSearch(params: { q: string; source?: string; id?: string; ekey?: string; }): Promise<SearchResult[]> {
  const { q, source, id, ekey } = params;
  if (!q) {
    return Promise.resolve([]);
  }
  const apiParams: Record<string, string> = { q };
  // 本地视频：使用 source + id
  if (source) {
    apiParams.source = source;
  }
  if (id) {
    apiParams.id = id;
  }
  // 站外视频：使用 ekey + id（ekey标识数据来源站点）
  if (ekey) {
    apiParams.ekey = ekey;
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
  const result = await fetchFromCmsApi<DoubanResult>('/api/cms/shine/page', { category: 'movie' }, 'maccms.DoubanResult');
  return normalizeResponseCode(result);
}

async function getTvShows(): Promise<DoubanResult> {
  const result = await fetchFromCmsApi<DoubanResult>('/api/cms/shine/page', { category: 'tv' }, 'maccms.DoubanResult');
  return normalizeResponseCode(result);
}

async function getVarietyShows(): Promise<DoubanResult> {
  const result = await fetchFromCmsApi<DoubanResult>('/api/cms/shine/page', { category: 'show' }, 'maccms.DoubanResult');
  return normalizeResponseCode(result);
}

async function getAnimes(): Promise<BangumiCalendarData[]> {
  let result: DoubanResult = await fetchFromCmsApi('/api/cms/shine/page', { category: 'anime' }, 'maccms.DoubanResult');
  result = normalizeResponseCode(result);

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
      vodid: item.vodid,
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
  const result = await fetchFromCmsApi<DoubanResult>('/api/cms/shine/page', { category: 'drama' }, 'maccms.DoubanResult');
  return normalizeResponseCode(result);
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

/**
 * 获取验证码
 * @param oldSessionId 可选的旧sessionId，如果提供则后端会移除旧的session
 */
export async function getCaptcha(oldSessionId?: string): Promise<{ sessionId: string; imageBase64: string }> {
  let url = `${API_BASE_URL}/api/cms/shine/captcha`;

  if (oldSessionId) {
    url += `?oldSessionId=${encodeURIComponent(oldSessionId)}`;
  }

  const response = await fetch(url, { method: 'GET' });

  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/x-protobuf')) {
    const buffer = await response.arrayBuffer();
    const root = await getProtoRoot();
    const MessageType = root.lookupType('maccms.CaptchaResponse');
    const decodedMessage = MessageType.decode(new Uint8Array(buffer));
    return MessageType.toObject(decodedMessage, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
    }) as { sessionId: string; imageBase64: string };
  }

  return response.json();
}

/**
 * 提交反馈/留言
 * @param type 类型：1=反馈建议 2=求片 3=报错
 * @param content 内容
 * @param sessionId 验证码sessionId
 * @param captchaAnswer 验证码答案
 * @param email 邮箱（可选）
 */
export async function submitFeedback(
  type: number,
  content: string,
  sessionId: string,
  captchaAnswer: string,
  email?: string
): Promise<{ code: number; message: string }> {
  const url = `${API_BASE_URL}/api/cms/shine/feedback`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      content,
      email,
      captchaAnswer,
      sessionId,
    }),
  });

  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/x-protobuf')) {
    const buffer = await response.arrayBuffer();
    const root = await getProtoRoot();
    const MessageType = root.lookupType('maccms.CommonResponse');
    const decodedMessage = MessageType.decode(new Uint8Array(buffer));
    return MessageType.toObject(decodedMessage, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
    }) as { code: number; message: string };
  }

  return response.json();
}

/**
 * 获取搜索建议或热搜
 * @param query 搜索查询，空字符串返回热搜
 */
async function getSuggestions(query: string): Promise<Array<{
  text: string;
  type: 'exact' | 'related' | 'suggestion';
  score?: number;
}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cms/shine/search/suggestions?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      console.error('Failed to fetch suggestions');
      return [];
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

async function decodeUrl(url: string, vodFrom: string, signal?: AbortSignal): Promise<DecodeResponse | null> {
  if (!url || !vodFrom) {
    return Promise.resolve(null);
  }
  try {
    return await fetchFromCmsApi<DecodeResponse>(`/api/cms/shine/decode_url`, { url:url, vodFrom:vodFrom }, 'maccms.DecodeResponse', signal);
  } catch (error) {
    // 如果是取消请求，不打印错误
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.error('Error decodeUrl :', error);
    // 404 等错误会在这里被捕获，返回 null 是符合预期的
    return null;
  }
}

export const maccmsProvider: DataProvider = {
  supportedCategories: ['movie', 'tv', 'show', 'anime', 'drama'],

  // New methods
  getHomePageData,
  getList,
  search,
  focusedSearch,
  detail,
  getSuggestions,
  // decode methods
  decodeUrl,

  // Feedback methods
  getCaptcha,
  submitFeedback,

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