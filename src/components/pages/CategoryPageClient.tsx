'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getList } from '@/lib/dataProvider';
import { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import FilterToolbar from '@/components/FilterToolbar';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

export function CategoryPageClient({ params, showFilter, activePath, noLayout }: { params: { type: string }, showFilter?: boolean, activePath?: string, noLayout?: boolean }) {
  const type = params.type;
  const [localPageSize, setLocalPageSize] = useState(10); // 一般分页默认最少十条
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
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setIsError(false);

    try {
      const result = await getList(path, extra, pageNum);
      if (result.code === 200) {
        if (pageNum === 1) {
          setData(result.list);
          setLocalPageSize(result.list.length);
        } else {
          setData(prev => [...prev, ...result.list]);
        }
        console.log(`localPageSizeNum ${localPageSizeNum} ${result.list.length >= localPageSizeNum}`)
        setHasMore(result.list.length >= localPageSizeNum); // (By Faker)
        if (pageNum > page) {
          setPage(pageNum);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsError(true);
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
  }, [loadData,localPageSize]);

  const showFilterResolved = showFilter ?? (process.env.NEXT_PUBLIC_SHOW_FILTER_TOOLBAR !== 'false');

  useEffect(() => {
    // When the filter is hidden, we manually trigger the initial data load
    // with a default path, as the toolbar is not present to do so.
    if (showFilterResolved === false) {
      const defaultPath = `${type}`;
      // Set the refs for pagination to work correctly
      currentFilterPath.current = defaultPath;
      currentFilterExtra.current = {};
      loadData(defaultPath, {}, 1, localPageSize);
    }
    // This effect should only run once on mount when the filter is hidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilterResolved, type]);

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
    return type === 'movie' ? '电影' : type === 'tv' ? '电视剧' : type === 'anime' ? '动漫' : type === 'show' ? '综艺' : '分类';
  };

  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // const cardFrom = (process.env.NEXT_PUBLIC_DATA_SOURCE === 'maccms' ? 'douban' : process.env.NEXT_PUBLIC_DATA_SOURCE) || 'douban';

  const content = (
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

          {!loading && data.length === 0 && (
            <div className='text-center text-gray-500 py-8'>暂无相关内容</div>
          )}
        </div>
      </div>
  );

  if (noLayout) {
    return content;
  }

  return (
    <PageLayout activePath={activePath || `/main?type=${type}`}>
      {content}
    </PageLayout>
  );
}
