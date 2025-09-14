
// lib/dataProvider.ts

import { doubanProvider } from './providers/douban.provider';
import { DataProvider, HomePageData } from './providers/interface';
import { maccmsProvider } from './providers/maccms.provider';

const useCms = process.env.DATA_SOURCE === 'maccms';

// 1. 根据配置，决定导出哪个“提供者”的实现
const provider: DataProvider = useCms ? maccmsProvider : doubanProvider;

/**
 * 智能的首页数据获取函数。
 * - 如果当前提供者实现了更高效的批量接口(getHomePageData)，则优先使用。
 * - 否则，并行调用所有独立的接口来“模拟”批量获取的行为。
 */
export async function getHomePageData(): Promise<HomePageData> {
  // 2. 优先使用批量接口
  if (provider.getHomePageData) {
    try {
      console.log('[DataProvider] Attempting to use batch API: getHomePageData');
      return await provider.getHomePageData();
    } catch (error) {
      console.warn('[DataProvider] Batch API failed, falling back to individual APIs.', error);
      // 如果批量接口失败（例如CMS未实现），则自动降级，继续执行下面的独立接口调用
    }
  }

  // 3. 如果没有批量接口或批量接口失败，则降级为并行调用独立接口
  console.log('[DataProvider] Using individual APIs in parallel.');
  const emptyCategoryResult = { code: 500, message: 'Fallback', list: [] };
  const emptyAnimesResult: any[] = [];

  const [movies, tvShows, varietyShows, animes, shortVideos] = await Promise.all([
    provider.getMovies().catch(handleProviderError('Movies', emptyCategoryResult)),
    provider.getTvShows().catch(handleProviderError('TV Shows', emptyCategoryResult)),
    provider.getVarietyShows().catch(handleProviderError('Variety Shows', emptyCategoryResult)),
    provider.getAnimes().catch(handleProviderError('Animes', emptyAnimesResult)),
    provider.getShortVideos().catch(handleProviderError('Short Videos', emptyCategoryResult)),
  ]);

  return { movies, tvShows, varietyShows, animes, shortVideos };
}

/**
 * 统一的错误处理函数，防止 Promise.all 因单个失败而中断
 * @param categoryName - 用于日志记录的分类名称
 * @returns 返回一个空的成功结果，确保 Promise.all 总是成功
 */
function handleProviderError(categoryName: string, fallbackData: any) {
  return (error: any) => {
    console.error(`[DataProvider] Failed to fetch ${categoryName}:`, error);
    return fallbackData;
  };
}
