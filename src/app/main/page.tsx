'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { supportedCategories } from '@/lib/dataProvider';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import PageLayout from '@/components/PageLayout';
import { CategoryPageClient } from '@/components/pages/CategoryPageClient';

import { HomeClient } from '@/app/page';

// 缓存过期时间（毫秒），默认 2 分钟
const CACHE_EXPIRE_TIME = 2 * 60 * 1000;

function MainContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as string;

  // 记录已加载过的页面类型及其时间戳
  const [cacheMap, setCacheMap] = useState<Map<string, number>>(new Map());
  const cacheMapRef = useRef<Map<string, number>>(new Map());

  // 验证 type 参数 (home 也是有效的)
  if (!type || (!supportedCategories.includes(type) && type !== 'home')) {
    notFound();
  }

  // 当 type 改变时，检查缓存并标记为已加载
  useEffect(() => {
    if (!type) return;

    const now = Date.now();
    const cachedTime = cacheMapRef.current.get(type);

    // 如果缓存不存在或已过期，重新加载
    if (!cachedTime || now - cachedTime > CACHE_EXPIRE_TIME) {
      setCacheMap(prev => {
        const newMap = new Map(prev);
        // 移除过期的缓存
        for (const [key, timestamp] of newMap.entries()) {
          if (now - timestamp > CACHE_EXPIRE_TIME) {
            newMap.delete(key);
          }
        }
        // 添加新的缓存
        newMap.set(type, now);
        cacheMapRef.current = newMap;
        return newMap;
      });
    }
  }, [type]);

  // 渲染所有已加载过且未过期的页面，通过 display 控制显示
  return (
    <PageLayout activePath={`/main?type=${type}`}>
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        {Array.from(cacheMap.keys()).map((cachedType) => (
          <div
            key={cachedType}
            style={{
              display: type === cachedType ? 'block' : 'none',
              position: type === cachedType ? 'relative' : 'absolute',
              width: '100%',
              top: 0,
              left: 0,
            }}
          >
            {cachedType === 'home' ? (
              <HomeClient noLayout />
            ) : (
              <CategoryPageClient params={{ type: cachedType }} activePath={`/main?type=${cachedType}`} noLayout />
            )}
          </div>
        ))}
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
