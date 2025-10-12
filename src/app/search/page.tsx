/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion,no-empty */
'use client';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { search } from '@/lib/dataProvider';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import SearchResultFilter, { SearchFilterCategory } from '@/components/SearchResultFilter';
import SearchSuggestions from '@/components/SearchSuggestions';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';

function SearchPageClient() {
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [localPageSize, setLocalPageSize] = useState(10); // 一页最少十条
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const pendingResultsRef = useRef<SearchResult[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [useFluidSearch, setUseFluidSearch] = useState(false); // 默认关闭流搜索
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  // 聚合卡片 refs 与聚合统计缓存
  const groupRefs = useRef<Map<string, React.RefObject<VideoCardHandle | null>>>(new Map());
  const groupStatsRef = useRef<Map<string, { douban_id?: number; episodes?: number; source_names: string[] }>>(new Map());

  const getGroupRef = (key: string) => {
    let ref = groupRefs.current.get(key);
    if (!ref) {
      ref = React.createRef<VideoCardHandle>();
      groupRefs.current.set(key, ref);
    }
    return ref;
  };

  const computeGroupStats = (group: SearchResult[]) => {
    const episodes = (() => {
      const countMap = new Map<number, number>();
      group.forEach((g) => {
        const count = g.episodes_count || 0;
        const len = count>0?count : g.episodes?.length || 0;
        if (len > 0) countMap.set(len, (countMap.get(len) || 0) + 1);
      });
      let max = 0;
      let res = 0;
      countMap.forEach((v, k) => {
        if (v > max) { max = v; res = k; }
      });
      return res;
    })();
    const source_names = Array.from(new Set(group.map((g) => g.source_name).filter(Boolean))) as string[];

    const douban_id = (() => {
      const countMap = new Map<number, number>();
      group.forEach((g) => {
        if (g.douban_id && g.douban_id > 0) {
          countMap.set(g.douban_id, (countMap.get(g.douban_id) || 0) + 1);
        }
      });
      let max = 0;
      let res: number | undefined;
      countMap.forEach((v, k) => {
        if (v > max) { max = v; res = k; }
      });
      return res;
    })();

    return { episodes, source_names, douban_id };
  };
  // 过滤器：非聚合与聚合
  const [filterAll, setFilterAll] = useState<{ source: string; title: string; year: string; yearOrder: 'none' | 'asc' | 'desc' }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });
  const [filterAgg, setFilterAgg] = useState<{ source: string; title: string; year: string; yearOrder: 'none' | 'asc' | 'desc' }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });

  // 获取默认聚合设置：只读取用户本地设置，默认为 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 默认启用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });

  // 在“无排序”场景用于每个源批次的预排序：完全匹配标题优先，其次年份倒序，未知年份最后
  const sortBatchForNoOrder = (items: SearchResult[]) => {
    const q = currentQueryRef.current.trim();
    return items.slice().sort((a, b) => {
      const aExact = (a.title || '').trim() === q;
      const bExact = (b.title || '').trim() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aNum = Number.parseInt(a.year as any, 10);
      const bNum = Number.parseInt(b.year as any, 10);
      const aValid = !Number.isNaN(aNum);
      const bValid = !Number.isNaN(bNum);
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      if (aValid && bValid) return bNum - aNum; // 年份倒序
      return 0;
    });
  };

  // 简化的年份排序：unknown/空值始终在最后
  const compareYear = (aYear: string, bYear: string, order: 'none' | 'asc' | 'desc') => {
    // 如果是无排序状态，返回0（保持原顺序）
    if (order === 'none') return 0;

    // 处理空值和unknown
    const aIsEmpty = !aYear || aYear === 'unknown';
    const bIsEmpty = !bYear || bYear === 'unknown';

    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return 1; // a 在后
    if (bIsEmpty) return -1; // b 在后

    // 都是有效年份，按数字比较
    const aNum = parseInt(aYear, 10);
    const bNum = parseInt(bYear, 10);

    return order === 'asc' ? aNum - bNum : bNum - aNum;
  };

  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = []; // 记录键出现的顺序

    searchResults.forEach((item) => {
      // 使用 title + year + type 作为键，year 必然存在，但依然兜底 'unknown'
      const key = `${item.title.replaceAll(' ', '')}-${item.year || 'unknown'
        }-${item.episodes?.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];

      // 如果是新的键，记录其顺序
      if (arr.length === 0) {
        keyOrder.push(key);
      }

      arr.push(item);
      map.set(key, arr);
    });

    // 按出现顺序返回聚合结果
    return keyOrder.map(key => [key, map.get(key)!] as [string, SearchResult[]]);
  }, [searchResults]);

  // 当聚合结果变化时，如果某个聚合已存在，则调用其卡片 ref 的 set 方法增量更新
  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group);
      const prev = groupStatsRef.current.get(mapKey);
      if (!prev) {
        // 第一次出现，记录初始值，不调用 ref（由初始 props 渲染）
        groupStatsRef.current.set(mapKey, stats);
        return;
      }
      // 对比变化并调用对应的 set 方法
      const ref = groupRefs.current.get(mapKey);
      if (ref && ref.current) {
        if (prev.episodes !== stats.episodes) {
          ref.current.setEpisodes(stats.episodes);
        }
        const prevNames = (prev.source_names || []).join('|');
        const nextNames = (stats.source_names || []).join('|');
        if (prevNames !== nextNames) {
          ref.current.setSourceNames(stats.source_names);
        }
        if (prev.douban_id !== stats.douban_id) {
          ref.current.setDoubanId(stats.douban_id);
        }
        groupStatsRef.current.set(mapKey, stats);
      }
    });
  }, [aggregatedResults]);

  // 构建筛选选项
  const filterOptions = useMemo(() => {
    const sourcesSet = new Map<string, string>();
    const titlesSet = new Set<string>();
    const yearsSet = new Set<string>();

    searchResults.forEach((item) => {
      if (item.source && item.source_name) {
        sourcesSet.set(item.source, item.source_name);
      }
      if (item.title) titlesSet.add(item.title);
      if (item.year) yearsSet.add(item.year);
    });

    const sourceOptions: { label: string; value: string }[] = [
      { label: '全部来源', value: 'all' },
      ...Array.from(sourcesSet.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ label, value })),
    ];

    const titleOptions: { label: string; value: string }[] = [
      { label: '全部标题', value: 'all' },
      ...Array.from(titlesSet.values())
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ label: t, value: t })),
    ];

    // 年份: 将 unknown 放末尾
    const years = Array.from(yearsSet.values());
    const knownYears = years.filter((y) => y !== 'unknown').sort((a, b) => parseInt(b) - parseInt(a));
    const hasUnknown = years.includes('unknown');
    const yearOptions: { label: string; value: string }[] = [
      { label: '全部年份', value: 'all' },
      ...knownYears.map((y) => ({ label: y, value: y })),
      ...(hasUnknown ? [{ label: '未知', value: 'unknown' }] : []),
    ];

    const categoriesAll: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    const categoriesAgg: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    return { categoriesAll, categoriesAgg };
  }, [searchResults]);

  // 非聚合：应用筛选与排序
  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;
    const filtered = searchResults.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });

    // 如果是无排序状态，直接返回过滤后的原始顺序
    if (yearOrder === 'none') {
      return filtered;
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const yearComp = compareYear(a.year, b.year, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a.title === searchQuery.trim();
      const bExactMatch = b.title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      return yearOrder === 'asc' ?
        a.title.localeCompare(b.title) :
        b.title.localeCompare(a.title);
    });
  }, [searchResults, filterAll, searchQuery]);

  // 聚合：应用筛选与排序
  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg as any;
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? '';
      const gYear = group[0]?.year ?? 'unknown';
      const hasSource = source === 'all' ? true : group.some((item) => item.source === source);
      if (!hasSource) return false;
      if (title !== 'all' && gTitle !== title) return false;
      if (year !== 'all' && gYear !== year) return false;
      return true;
    });

    // 如果是无排序状态，保持按关键字+年份+类型出现的原始顺序
    if (yearOrder === 'none') {
      return filtered;
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const aYear = a[1][0].year;
      const bYear = b[1][0].year;
      const yearComp = compareYear(aYear, bYear, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      const aTitle = a[1][0].title;
      const bTitle = b[1][0].title;
      return yearOrder === 'asc' ?
        aTitle.localeCompare(bTitle) :
        bTitle.localeCompare(aTitle);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  useEffect(() => {
    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 读取流式搜索设置
    if (typeof window !== 'undefined') {
      const savedFluidSearch = localStorage.getItem('fluidSearch');
      // 仅当全局配置明确设置为 true 时，才默认启用
      const defaultFluidSearch = (window as any).RUNTIME_CONFIG?.FLUID_SEARCH === true;
      if (savedFluidSearch !== null) {
        setUseFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setUseFluidSearch(defaultFluidSearch);
      } else {
        // 若没有任何配置，默认关闭
        setUseFluidSearch(false);
      }

    }

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      }
    );

    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持续检测滚动位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 启动持续检测
    isRunning = true;
    checkScrollPosition();

    // 监听 body 元素的滚动事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      isRunning = false; // 停止 requestAnimationFrame 循环

      // 移除 body 滚动事件监听器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

        const loadData = useCallback(
          async (query: string, pageNum: number, localPageSizeNum: number) => {
            if (pageNum === 1) {
              setIsLoading(true);
              setSearchResults([]);
              setTotalSources(0);
              setCompletedSources(0);
              pendingResultsRef.current = [];
              if (flushTimerRef.current) {
                clearTimeout(flushTimerRef.current);
                flushTimerRef.current = null;
              }
            } else {
              setIsLoadingMore(true);
            }
            setIsError(false);
            
            let currentFluidSearch = useFluidSearch;
            if (typeof window !== 'undefined') {
              const savedFluidSearch = localStorage.getItem('fluidSearch');
              if (savedFluidSearch !== null) {
                currentFluidSearch = JSON.parse(savedFluidSearch);
              }
              else {
                const defaultFluidSearch = (window as any).RUNTIME_CONFIG?.FLUID_SEARCH === true;
                currentFluidSearch = defaultFluidSearch;
              }
            }
            if (currentFluidSearch !== useFluidSearch) {
              setUseFluidSearch(currentFluidSearch);
            }
      
            if (currentFluidSearch) {
              if (pageNum > 1) {
                setHasMore(false);
                setIsLoadingMore(false);
                return;
              }
              const es = (await search({ search: query }, true)) as EventSource;
              eventSourceRef.current = es;
              es.onmessage = (event) => {
                if (!event.data) return;
                try {
                  const payload = JSON.parse(event.data);
                  if (currentQueryRef.current !== query) return;
                  switch (payload.type) {
                    case 'start':
                      setTotalSources(payload.totalSources || 0);
                      setCompletedSources(0);
                      break;
                    case 'source_result': {
                      setCompletedSources((prev) => prev + 1);
                      if (Array.isArray(payload.results) && payload.results.length > 0) {
                        const activeYearOrder = (viewMode === 'agg' ? (filterAgg.yearOrder) : (filterAll.yearOrder));
                        const incoming: SearchResult[] =
                          activeYearOrder === 'none'
                            ? sortBatchForNoOrder(payload.results as SearchResult[])
                            : (payload.results as SearchResult[]);
                        pendingResultsRef.current.push(...incoming);
                        if (!flushTimerRef.current) {
                          flushTimerRef.current = window.setTimeout(() => {
                            const toAppend = pendingResultsRef.current;
                            pendingResultsRef.current = [];
                            startTransition(() => {
                              setSearchResults((prev) => prev.concat(toAppend));
                            });
                            flushTimerRef.current = null;
                          }, 80);
                        }
                      }
                      break;
                    }
                    case 'source_error':
                      setCompletedSources((prev) => prev + 1);
                      break;
                    case 'complete':
                      setCompletedSources(payload.completedSources || totalSources);
                      if (pendingResultsRef.current.length > 0) {
                        const toAppend = pendingResultsRef.current;
                        pendingResultsRef.current = [];
                        if (flushTimerRef.current) {
                          clearTimeout(flushTimerRef.current);
                          flushTimerRef.current = null;
                        }
                        startTransition(() => {
                          setSearchResults((prev) => prev.concat(toAppend));
                        });
                      }
                      setIsLoading(false);
                      setHasMore(false);
                      try { es.close(); } catch { }
                      if (eventSourceRef.current === es) {
                        eventSourceRef.current = null;
                      }
                      break;
                  }
                } catch { }
              };
              es.onerror = () => {
                setIsLoading(false);
                if (pendingResultsRef.current.length > 0) {
                  const toAppend = pendingResultsRef.current;
                  pendingResultsRef.current = [];
                  if (flushTimerRef.current) {
                    clearTimeout(flushTimerRef.current);
                    flushTimerRef.current = null;
                  }
                  startTransition(() => {
                    setSearchResults((prev) => prev.concat(toAppend));
                  });
                }
                try { es.close(); } catch { }
                if (eventSourceRef.current === es) {
                  eventSourceRef.current = null;
                }
              };
            } else {
              try {
                const results = (await search({ search: query }, false, pageNum)) as SearchResult[];
                if (currentQueryRef.current !== query) return;
      
                if (results && Array.isArray(results)) {
                results.forEach(item=>{
                  if((item.episodes_count||0) < 1 && ((item.episodes?.length ||0) > 0)){
                      item.episodes_count=item.episodes?.length || 0;
                  }
                  if((item.episodes_count || 0) < 0)item.episodes_count = 0;
                });

                  const activeYearOrder = viewMode === 'agg' ? filterAgg.yearOrder : filterAll.yearOrder;
                  const sortedResults: SearchResult[] =
                    activeYearOrder === 'none' ? sortBatchForNoOrder(results) : results;
      
                  if (pageNum === 1) {
                    setSearchResults(sortedResults);
                   // 优化不更新localpagesize，因为搜索页每一页返回数据大小不固定，无法确定pagesize，使用默认值（By Faker）
                   // setLocalPageSize(results.length);
                  } else {
                    setSearchResults((prev) => [...prev, ...sortedResults]);
                  }
                  setHasMore(results.length >= localPageSizeNum);
                  setPage(pageNum); // Only update page on success
                } else {
                  setHasMore(false);
                }
              } catch (error) {
                console.error('Error search data:', error);
                setIsError(true);
              } finally {
                if (pageNum === 1) {
                  setIsLoading(false);
                }
                else {
                  setIsLoadingMore(false);
                }
              }
            }
          },
          [useFluidSearch, viewMode, filterAgg.yearOrder, filterAll.yearOrder]
        );
      
        useEffect(() => {
          const query = searchParams.get('q') || '';
          currentQueryRef.current = query.trim();
      
          if (query) {
            setSearchQuery(query);
            setShowResults(true);
            setPage(1);
            setHasMore(true);
            loadData(query.trim(), 1, localPageSize);
            addSearchHistory(query);
          } else {
            setShowResults(false);
            setShowSuggestions(false);
          }
        }, [searchParams, loadData]);
      
        useEffect(() => {
          if (isLoading || isLoadingMore || !hasMore) return;
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting && !isError) {
                const nextPage = searchResults.length === 0 ? 1 : page + 1;
                loadData(currentQueryRef.current, nextPage, localPageSize);
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
            if (observerRef.current) observerRef.current.disconnect();
          };
        }, [isLoading, isLoadingMore, hasMore, isError, page, searchResults.length, loadData, localPageSize]);        
      // 组件卸载时，关闭可能存在的连接
      useEffect(() => {
        return () => {
          if (eventSourceRef.current) {
            try { eventSourceRef.current.close(); } catch { }
            eventSourceRef.current = null;
          }
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          pendingResultsRef.current = [];
        };
      }, []);
    
      // 输入框内容变化时触发，显示搜索建议
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        // 无论有无内容都显示建议框（有内容显示建议，无内容显示热搜）
        setShowSuggestions(true);
      };

      // 搜索框聚焦时触发，显示搜索建议或热搜
      const handleInputFocus = () => {
        // 聚焦时始终显示建议框
        setShowSuggestions(true);
      };

      // 搜索框失焦时触发，关闭建议框（移动端键盘收起时会触发）
      const handleInputBlur = () => {
        // 延迟关闭，给点击建议项留出时间
        setTimeout(() => {
          setShowSuggestions(false);
        }, 200);
      };
    
      // 搜索表单提交时触发，处理搜索逻辑
      const handleSearch = (e: React.FormEvent) => {      e.preventDefault();
      const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
      if (!trimmed) return;
  
      setSearchQuery(trimmed);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    };
  
    const handleSuggestionSelect = (suggestion: string) => {
      setSearchQuery(suggestion);
      setShowSuggestions(false);
          router.push(`/search?q=${encodeURIComponent(suggestion)}`);
        };
      
        // 返回顶部功能
        const scrollToTop = () => {
          try {
            // 根据调试结果，真正的滚动容器是 document.body
            document.body.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          } catch (error) {
            // 如果平滑滚动完全失败，使用立即滚动
            document.body.scrollTop = 0;
          }
        };
      
        return (
          <PageLayout activePath='/search'>
            <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible mb-10'>
              {/* 搜索框 */}
              <div className='mb-8'>
                <form onSubmit={handleSearch} className='max-w-2xl mx-auto'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
                    <input
                      id='searchInput'
                      type='text'
                      value={searchQuery}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder='搜索电影、电视剧...'
                      autoComplete="off"
                      className='w-full h-12 py-3 pl-10 pr-12 text-base text-gray-700 placeholder-gray-400 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 rounded-3xl shadow-sm'
                      style={{
                        outline: 'none',
                        border: 'none',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      }}
                    />
      
                    {/* 清除按钮 */}
                    {searchQuery && (
                      <button
                        type='button'
                        onClick={() => {
                          setSearchQuery('');
                          setShowSuggestions(false);
                          document.getElementById('searchInput')?.focus();
                        }}
                        className='absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300'
                        aria-label='清除搜索内容'
                      >
                        <X className='h-5 w-5' />
                      </button>
                    )}
      
                    {/* 搜索建议/热搜 统一对话框 */}
                    <SearchSuggestions
                      query={searchQuery}
                      isVisible={showSuggestions}
                      hasContent={!!searchQuery.trim()}
                      onSelect={handleSuggestionSelect}
                      onClose={() => setShowSuggestions(false)}
                      onEnterKey={() => {
                        // 当用户按回车键时，使用搜索框的实际内容进行搜索
                        const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
                        if (!trimmed) return;

                        // 回显搜索框
                        setSearchQuery(trimmed);
                        setIsLoading(true);
                        setShowResults(true);
                        setShowSuggestions(false);

                        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
                      }}
                    />
                  </div>
                </form>
              </div>
      
              {/* 搜索结果或搜索历史 */}
              <div className='max-w-[95%] mx-auto mt-12 overflow-visible'>
                {showResults ? (
                  <section className='mb-12'>
                    {/* 标题 */}
                    <div className='mb-4'>
                      <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                        搜索结果
                        {totalSources > 0 && useFluidSearch && (
                          <span className='ml-2 text-sm font-normal text-gray-500 dark:text-gray-400'>
                            {completedSources}/{totalSources}
                          </span>
                        )}
                        {isLoading && useFluidSearch && (
                          <span className='ml-2 inline-block align-middle'>
                            <span className='inline-block h-3 w-3 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin'></span>
                          </span>
                        )}
                      </h2>
                    </div>
                    {/* 筛选器 + 聚合开关 同行 */}
                    <div className='mb-8 flex items-center justify-between gap-3'>
                      <div className='flex-1 min-w-0'>
                        {viewMode === 'agg' ? (
                          <SearchResultFilter
                            categories={filterOptions.categoriesAgg}
                            values={filterAgg}
                            onChange={(v) => setFilterAgg(v as any)}
                          />
                        ) : (
                          <SearchResultFilter
                            categories={filterOptions.categoriesAll}
                            values={filterAll}
                            onChange={(v) => setFilterAll(v as any)}
                          />
                        )}
                      </div>
                      {/* 聚合开关 */}
                      <label className='flex items-center gap-2 cursor-pointer select-none shrink-0'>
                        <span className='text-xs sm:text-sm text-gray-700 dark:text-gray-300'>聚合</span>
                        <div className='relative'>
                          <input
                            type='checkbox'
                            className='sr-only peer'
                            checked={viewMode === 'agg'}
                            onChange={() => setViewMode(viewMode === 'agg' ? 'all' : 'agg')}
                          />
                          <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                          <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                        </div>
                      </label>
                    </div>
                    {searchResults.length === 0 ? (
                      isLoading ? (
                        <div className='flex justify-center items-center h-40'>
                          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
                        </div>
                      ) : (
                        <div className='text-center text-gray-500 py-8 dark:text-gray-400'>
                          未找到相关结果
                        </div>
                      )
                    ) : (
                      <div
                        key={`search-results-${viewMode}`}
                        className='justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
                      >
                        {viewMode === 'agg'
                          ? filteredAggResults.map(([mapKey, group], index) => {
                            const title = group[0]?.title || '';
                            const poster = group[0]?.poster || '';
                            const year = group[0]?.year || 'unknown';
                            const { episodes, source_names, douban_id } = computeGroupStats(group);
                            // 仅传递ids，不传递id
                            const ids = Array.from(new Set(group.map((g) => g.id).filter(Boolean))) as string[]; // 返回聚合后的vodid （By Faker）
                            // 提取ekeys数组（与ids一一对应，站外视频有值，本地视频为空字符串）
                            const seenIds = new Set<string>();
                            const ekeys = group
                              .filter((g) => {
                                if (!g.id) return false;
                                if (seenIds.has(g.id)) return false;
                                seenIds.add(g.id);
                                return true;
                              })
                              .map((g) => g.ekey || '');
                            const type = episodes === 1 ? 'movie' : 'tv';

                            // 如果该聚合第一次出现，写入初始统计
                            if (!groupStatsRef.current.has(mapKey)) {
                              groupStatsRef.current.set(mapKey, { episodes, source_names, douban_id });
                            }

                            return (
                              <div key={`agg-${mapKey}`} className='w-full'>
                                <VideoCard
                                  ref={getGroupRef(mapKey)}
                                  from='search'
                                  ids={ids}
                                  ekeys={ekeys}
                                  isAggregate={true}
                                  title={title}
                                  poster={poster}
                                  year={year}
                                  episodes={episodes}
                                  source_names={source_names}
                                  douban_id={douban_id}
                                  query={
                                    searchQuery.trim() !== title
                                      ? searchQuery.trim()
                                      : ''
                                  }
                                  type={type}
                                  priority={index < 1}
                                />
                              </div>
                            );
                          })
                          : filteredAllResults.map((item, index) => (
                            <div
                              key={`all-${item.source}-${item.id}`}
                              className='w-full'
                            >
                              <VideoCard
                                id={item.id}
                                title={item.title}
                                poster={item.poster}
                                episodes={item.episodes_count}
                                source={item.source}
                                ekey={item.ekey}
                                source_name={item.source_name}
                                douban_id={item.douban_id}
                                query={
                                  searchQuery.trim() !== item.title
                                    ? searchQuery.trim()
                                    : ''
                                }
                                year={item.year}
                                from='search'
                                type={(item.episodes_count||0) > 1 ? 'tv' : 'movie'}
                                priority={index < 1}
                              />
                            </div>
                          ))}
                      </div>
                    )}
      
                    {hasMore && !isLoading && (
                      <div ref={loadingRef} className='flex justify-center mt-12 py-8'>
                        {isLoadingMore && (
                          <div className='flex items-center gap-2'>
                            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
                            <span className='text-gray-600'>加载中...</span>
                          </div>
                        )}
                      </div>
                    )}
      
                    {false && !hasMore && searchResults.length > 0 && (
                      <div className='text-center text-gray-500 py-8'>已加载全部内容</div>
                    )}
                  </section>
                ) : searchHistory.length > 0 ? (
                  // 搜索历史
                  <section className='mb-12'>
                    <h2 className='mb-4 text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
                      搜索历史
                      {searchHistory.length > 0 && (
                        <button
                          onClick={() => {
                            clearSearchHistory(); // 事件监听会自动更新界面
                          }}
                          className='ml-3 text-sm text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-500'
                        >
                          清空
                        </button>
                      )}
                    </h2>
                    <div className='flex flex-wrap gap-2'>
                      {searchHistory.map((item) => (
                        <div key={item} className='relative group'>
                          <button
                            onClick={() => {
                              setSearchQuery(item);
                              router.push(
                                `/search?q=${encodeURIComponent(item.trim())}`
                              );
                            }}
                            className='px-4 py-2 bg-gray-500/10 hover:bg-gray-300 rounded-full text-sm text-gray-700 transition-colors duration-200 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-300'
                          >
                            {item}
                          </button>
                          {/* 删除按钮 */}
                          <button
                            aria-label='删除搜索历史'
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              deleteSearchHistory(item); // 事件监听会自动更新界面
                            }}
                            className='absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] transition-colors'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
      
            {/* 返回顶部悬浮按钮 */}
            <button
              onClick={scrollToTop}
              className={`fixed bottom-20 md:bottom-6 right-6 z-[500] w-12 h-12 bg-green-500/90 hover:bg-green-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${showBackToTop
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              aria-label='返回顶部'
            >
              <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
            </button>
          </PageLayout>
        );
      }export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
