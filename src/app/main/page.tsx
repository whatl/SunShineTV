'use client';

import { useSearchParams, notFound } from 'next/navigation';
import { Suspense } from 'react';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import { supportedCategories } from '@/lib/dataProvider';
import { CategoryPageClient } from '@/components/pages/CategoryPageClient';

function MainContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as string;

  // 验证 type 参数
  if (!type || !supportedCategories.includes(type)) {
    notFound();
  }

  // 将 type 转换为 params 格式传递给 CategoryPageClient
  return <CategoryPageClient params={{ type }} activePath={`/main?type=${type}`} />;
}

export default function MainPage() {
  return (
    <Suspense fallback={<div className="p-4"><DoubanCardSkeleton count={12} /></div>}>
      <MainContent />
    </Suspense>
  );
}
