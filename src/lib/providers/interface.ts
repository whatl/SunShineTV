
// lib/providers/interface.ts

import { BangumiCalendarData } from '../bangumi.client';
import { DoubanItem } from '../types';

/**
 * 统一的分类或板块的数据返回结构
 */
export interface CategoryResult {
  code: number;
  message: string;
  list: DoubanItem[]; // 复用现有的 DoubanItem 类型，它足够通用
}

/**
 * 统一的首页批量数据的返回结构
 */
export interface HomePageData {
  movies: CategoryResult;
  tvShows: CategoryResult;
  varietyShows: CategoryResult;
  animes: BangumiCalendarData[]; // <-- 这里使用正确的、未经破坏的番剧数据类型
  shortVideos: CategoryResult;
}

/**
 * 数据提供者必须实现的接口契约
 */
export interface DataProvider {
  // 优先使用的批量接口，如果提供者不支持，可以不实现
  getHomePageData?: () => Promise<HomePageData>;

  // 独立的、必须实现的接口
  getMovies: () => Promise<CategoryResult>;
  getTvShows: () => Promise<CategoryResult>;
  getVarietyShows: () => Promise<CategoryResult>;
  getAnimes: () => Promise<BangumiCalendarData[]>; // <-- 这里使用正确的、未经破坏的番剧数据类型
  getShortVideos: () => Promise<CategoryResult>;
}
