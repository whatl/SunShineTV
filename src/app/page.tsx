'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';


function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 立即重定向到 /main?type=home 以使用缓存功能
    router.replace('/main?type=home');
  }, [router]);

  // 返回 null 避免显示任何内容
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
