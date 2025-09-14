// lib/providers/maccms.provider.ts

import { BangumiCalendarData } from '../bangumi.client';
import { CategoryResult, DataProvider, HomePageData } from './interface';

// 苹果CMS提供者，实现了 DataProvider 接口
// 注意：当前所有函数都是占位符，等待后端API实现后填充真实逻辑

const NOT_IMPLEMENTED_ERROR = 'Maccms provider is not yet implemented.';

async function getHomePageData(): Promise<HomePageData> {
  console.log('[DataProvider]', NOT_IMPLEMENTED_ERROR, 'getHomePageData');
  // 未来将 fetch('/api/cms/home')
  throw new Error(NOT_IMPLEMENTED_ERROR);
}

async function getMovies(): Promise<CategoryResult> {
  console.log('[DataProvider]', NOT_IMPLEMENTED_ERROR, 'getMovies');
  // 未来将 fetch('/api/cms/movies')
  throw new Error(NOT_IMPLEMENTED_ERROR);
}

async function getTvShows(): Promise<CategoryResult> {
  console.log('[DataProvider]', NOT_IMPLEMENTED_ERROR, 'getTvShows');
  // 未来将 fetch('/api/cms/tvshows')
  throw new Error(NOT_IMPLEMENTED_ERROR);
}

async function getVarietyShows(): Promise<CategoryResult> {
  console.log('[DataProvider]', NOT_IMPLEMENTED_ERROR, 'getVarietyShows');
  // 未来将 fetch('/api/cms/varietyshows')
  throw new Error(NOT_IMPLEMENTED_ERROR);
}

async function getAnimes(): Promise<BangumiCalendarData[]> {
  console.log('[DataProvider]', NOT_IMPLEMENTED_ERROR, 'getAnimes');
  // 未来将 fetch('/api/cms/animes')
  throw new Error(NOT_IMPLEMENTED_ERROR);
}

async function getShortVideos(): Promise<CategoryResult> {
  console.log('[DataProvider]', NOT_IMPLEMENTED_ERROR, 'getShortVideos');
  // 未来将 fetch('/api/cms/shortvideos')
  return Promise.resolve({ code: 200, message: 'Success', list: [] });
}

// 导出所有函数，符合 DataProvider 接口
export const maccmsProvider: DataProvider = {
  getHomePageData,
  getMovies,
  getTvShows,
  getVarietyShows,
  getAnimes,
  getShortVideos,
};