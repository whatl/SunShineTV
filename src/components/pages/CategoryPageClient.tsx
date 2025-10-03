'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getCache, setCache } from '@/lib/tempcache';
import { getList } from '@/lib/dataProvider';
import { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import FilterToolbar from '@/components/FilterToolbar';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

export function CategoryPageClient({ params, showFilter, activePath }: { params: { type: string }, showFilter?: boolean, activePath?: string }) {
  const type = params.type;

  const [localPageSize, setLocalPageSize] = useState(10);
  const [data, setData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const currentFilterPath = useRef<string>('');
  const currentFilterExtra = useRef<Record<string, string>>({});

  const loadData = useCallback(async (path: string, extra: Record<string, string>, pageNum: number, localPageSizeNum: number) => {
    const cacheKey = `category_${path}_${JSON.stringify(extra)}_page${pageNum}`;
    // 读取缓存
    const cached = getCache<DoubanItem[]>(cacheKey);
    // 记录开始时间（用于保证最小 loading 时长）
    const startTime = Date.now();
    let shouldShowLoading = false;

    if (pageNum === 1) {
      // 第一页：如果没有缓存才显示 loading
      if (!cached) {
        setLoading(true);
        shouldShowLoading = true;
      }
    } else {
      setIsLoadingMore(true);
    }
    setIsError(false);

    try {
      const result = await getList(path, extra, pageNum); 
      // 如果需要显示 loading，保证最少显示时间
      if (shouldShowLoading) {
        const elapsed = Date.now() - startTime;
        const minLoadingTime = 250;
        const remainingTime = Math.max(0, minLoadingTime - elapsed);
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }

      if (result.code === 200) {
        if (pageNum === 1) {
          // 缓存第一页数据
          setCache(cacheKey, result.list);

          // 对比缓存数据，如果不一致才更新
          const needUpdate = !cached || JSON.stringify(cached) !== JSON.stringify(result.list);
          if (needUpdate) {
            setData(result.list);
            setLocalPageSize(result.list.length);
          }
        } else {
          setData(prev => [...prev, ...result.list]);
        }
        setHasMore(result.list.length >= localPageSizeNum);
        if (pageNum > page) {
          setPage(pageNum);
        }
        setIsError(false);
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // 只有真正的错误才设置 isError
      setIsError(true);
      // 加载失败时，如果是第一页则停止加载更多
      if (pageNum === 1) {
        setHasMore(false);
      }
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [page]);

  const handleFilterChange = useCallback((path: string, extra: Record<string, string>) => {
    if (path !== currentFilterPath.current || JSON.stringify(extra) !== JSON.stringify(currentFilterExtra.current)) {
      currentFilterPath.current = path;
      currentFilterExtra.current = extra;
      setPage(1);
      setData([]);
      setHasMore(true);
      setIsError(false);
      loadData(path, extra, 1, localPageSize);
    }
  }, [loadData, localPageSize]);

  const showFilterResolved = showFilter ?? (process.env.NEXT_PUBLIC_SHOW_FILTER_TOOLBAR !== 'false');

  // 监听 type 变化，立即从缓存加载数据,先恢复成默认值
  useEffect(() => {
    // 读取该 type 的缓存（只读取一次）
    const cacheKey = `category_${type}_{}_page1`;
    const cached = getCache<DoubanItem[]>(cacheKey);
    const hasCache = !!cached;
    // 根据缓存状态一次性设置所有状态
    if (hasCache) {
      // 有缓存：立即显示，不显示 loading
      setData(cached);
      setLoading(false);
    } else {
      // 无缓存：清空数据，显示 loading
      setData([]);
      setLoading(true);
    }
    // 重置分页状态
    setPage(1);
    setHasMore(true);
    setIsError(false);

    // 触发数据加载（有缓存也加载，用于静默更新）
    if (showFilterResolved === false) {
      const defaultPath = `${type}`;
      currentFilterPath.current = defaultPath;
      currentFilterExtra.current = {};
      loadData(defaultPath, {}, 1, localPageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (loading || isLoadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isError) {
          loadData(currentFilterPath.current, currentFilterExtra.current, page + 1, localPageSize);
        } else if (!entries[0].isIntersecting) {
          setIsError(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, isLoadingMore, hasMore, page, loadData, localPageSize, isError]);

  const getPageTitle = () => {
    return type === 'movie' ? '电影' : type === 'tv' ? '电视剧' : type === 'anime' ? '动漫' : type === 'show' ? '综艺' : type === 'drama' ? '短剧' : '分类';
  };

  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // const cardFrom = (process.env.NEXT_PUBLIC_DATA_SOURCE === 'maccms' ? 'douban' : process.env.NEXT_PUBLIC_DATA_SOURCE) || 'douban';

  return (
    <PageLayout activePath={activePath || `/main?type=${type}`}>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible'>
        <div className='mb-6 sm:mb-8 space-y-4 sm:space-y-6'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200'>
              {getPageTitle()}
            </h1>
            <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
              探索来自全网的精选内容
            </p>
          </div>
          {/* The missing container with background and rounding */}
          {showFilterResolved && (
            <div className='bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
              <FilterToolbar onFilterChange={handleFilterChange} />
            </div>
          )}
        </div>

        <div className='max-w-[95%] mx-auto mt-8 overflow-visible'>
          <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20'>
            {loading
              ? skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
              : data.map((item, index) => (
                  <div key={`${item.id}-${index}`} className='w-full'>
                    <VideoCard
                      from="base"
                      id={item.vodid}
                      title={item.title}
                      poster={item.poster}
                      douban_id={Number(item.id)}
                      rate={item.rate}
                      year={item.year}
                      type={type === 'movie' ? 'movie' : ''}
                    />
                  </div>
                ))}
          </div>

          {hasMore && !loading && (
            <div
              ref={loadingRef}
              className='flex justify-center mt-12 py-8'
            >
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
                  <span className='text-gray-600'>加载中...</span>
                </div>
              )}
            </div>
          )}

          {!hasMore && data.length > 0 && (
            <div className='text-center text-gray-500 py-8'>已加载全部内容</div>
          )}

          {!loading && data.length === 0 && !isError && (
            <div className='text-center text-gray-500 py-8'>暂无相关内容</div>
          )}

          {!loading && data.length === 0 && isError && (
            <div className='text-center py-8'>
              <p className='text-gray-500 mb-4'>加载失败，请重试</p>
              <button
                onClick={() => loadData(currentFilterPath.current, currentFilterExtra.current, 1, localPageSize)}
                className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200'
              >
                重新加载
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
