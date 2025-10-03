'use client';

import { notFound,useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { supportedCategories } from '@/lib/dataProvider';

import { CategoryPageClient } from '@/components/pages/CategoryPageClient';
import { HomeClient } from '@/components/pages/HomeClient';

function MainContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as string;

  // 验证 type 参数 (home 也是有效的)
  if (!type || (!supportedCategories.includes(type) && type !== 'home')) {
    notFound();
  }

  // 根据 type 渲染不同的页面
  if (type === 'home') {
    return <HomeClient />;
  }

  // 将 type 转换为 params 格式传递给 CategoryPageClient
  return <CategoryPageClient params={{ type }} activePath={`/main?type=${type}`} />;
}

export default function MainPage() {
  return (
    <Suspense>
      <MainContent />
    </Suspense>
  );
}
