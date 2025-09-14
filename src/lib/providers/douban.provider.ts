
// lib/providers/douban.provider.ts

import { GetBangumiCalendarData, BangumiCalendarData } from '../bangumi.client';
import { getDoubanCategories } from '../douban.client';
import { CategoryResult, DataProvider } from './interface';

// 豆瓣提供者，实现了 DataProvider 接口

async function getMovies(): Promise<CategoryResult> {
  return getDoubanCategories({ kind: 'movie', category: '热门', type: '全部' });
}

async function getTvShows(): Promise<CategoryResult> {
  return getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' });
}

async function getVarietyShows(): Promise<CategoryResult> {
  return getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' });
}

async function getAnimes(): Promise<BangumiCalendarData[]> {
  // 直接返回原始的、未经破坏的番剧日历数据
  return GetBangumiCalendarData();
}

async function getShortVideos(): Promise<CategoryResult> {
  // 预留接口，暂时返回空
  return Promise.resolve({ code: 200, message: 'Success', list: [] });
}

// 导出所有函数，符合 DataProvider 接口
export const doubanProvider: DataProvider = {
  getMovies,
  getTvShows,
  getVarietyShows,
  getAnimes,
  getShortVideos,
};
