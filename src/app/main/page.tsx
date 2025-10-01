'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { supportedCategories } from '@/lib/dataProvider';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import PageLayout from '@/components/PageLayout';
import { CategoryPageClient } from '@/components/pages/CategoryPageClient';

import { HomeClient } from '@/app/page';

// 缓存过期时间（毫秒），默认 1 分钟
const CACHE_EXPIRE_TIME = 1 * 60 * 1000;

// 最大缓存页面数量
const MAX_CACHE_SIZE = 4;

// 样式常量
const HIDDEN_STYLE = {
  display: 'none' as const,
  position: 'absolute' as const,
  width: '100%',
  top: 0,
  left: 0
};

const VISIBLE_STYLE = {
  display: 'block' as const,
  position: 'relative' as const,
  width: '100%'
};

function MainContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as string;

  // 记录已加载过的页面类型及其时间戳
  const [cacheMap, setCacheMap] = useState<Map<string, number>>(new Map());

  // 验证 type 参数 (home 也是有效的)
  if (!type || (!supportedCategories.includes(type) && type !== 'home')) {
    notFound();
  }

  // 当 type 改变时，检查缓存并标记为已加载
  useEffect(() => {
    if (!type) return;

    setCacheMap(prev => {
      const now = Date.now();
      const cachedTime = prev.get(type);

      // 如果缓存存在且未过期，不需要更新
      if (cachedTime && now - cachedTime <= CACHE_EXPIRE_TIME) {
        return prev;
      }

      // 创建新的 Map，移除过期缓存并添加当前类型
      const newMap = new Map<string, number>();

      // 先过滤出未过期的缓存
      const validEntries: [string, number][] = [];
      for (const [key, timestamp] of prev.entries()) {
        if (now - timestamp <= CACHE_EXPIRE_TIME) {
          validEntries.push([key, timestamp]);
        }
      }

      // 如果超过最大缓存数量，移除最旧的（按时间戳排序）
      if (validEntries.length >= MAX_CACHE_SIZE) {
        validEntries.sort((a, b) => b[1] - a[1]); // 按时间戳降序排序
        validEntries.splice(MAX_CACHE_SIZE - 1); // 保留最新的 MAX_CACHE_SIZE - 1 个
      }

      // 添加回 Map
      for (const [key, timestamp] of validEntries) {
        newMap.set(key, timestamp);
      }

      // 添加当前类型
      newMap.set(type, now);
      return newMap;
    });
  }, [type]);

  // 缓存的页面类型列表（使用 useMemo 避免每次渲染都创建新数组）
  const cachedTypes = useMemo(() => Array.from(cacheMap.keys()), [cacheMap]);

  // 渲染所有已加载过且未过期的页面，通过 display 控制显示
  return (
    <PageLayout activePath={`/main?type=${type}`}>
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        {cachedTypes.map((cachedType) => {
          const isVisible = type === cachedType;
          return (
            <div
              key={cachedType}
              style={isVisible ? VISIBLE_STYLE : HIDDEN_STYLE}
            >
              {cachedType === 'home' ? (
                <HomeClient noLayout />
              ) : (
                <CategoryPageClient
                  params={{ type: cachedType }}
                  activePath={`/main?type=${cachedType}`}
                  noLayout
                />
              )}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}

export default function MainPage() {
  return (
    <Suspense fallback={<div className="p-4"><DoubanCardSkeleton count={12} /></div>}>
      <MainContent />
    </Suspense>
  );
}
