/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Cat, Clover, Film, Home, Star, Tv, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { supportedCategories } from '@/lib/dataProvider';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  const [navItems, setNavItems] = useState(() => {
    const items = [
      { icon: Home, label: '首页', href: '/main?type=home' },
      {
        icon: Film,
        label: '电影',
        href: '/main?type=movie',
      },
      {
        icon: Tv,
        label: '剧集',
        href: '/main?type=tv',
      },
      {
        icon: Cat,
        label: '动漫',
        href: '/main?type=anime',
      },
      {
        icon: Clover,
        label: '综艺',
        href: '/main?type=show',
      },
      // 直播开关(By Faker)
      // {
      //   icon: Radio,
      //   label: '直播',
      //   href: '/live',
      // },
    ];

    // 只在 supportedCategories 包含 drama 时添加短剧
    if (supportedCategories.includes('drama')) {
      items.push({
        icon: Video,
        label: '短剧',
        href: '/main?type=drama',
      });
    }

    return items;
  });

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;

    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setNavItems(prev => [...prev, {
        icon: Star,
        label: '自定义',
        href: '/douban?type=custom', // This will redirect
      }]);
    }
  }, []);

  const isActive = (href: string) => {
    // For the homepage, check both old and new paths
    if (href === '/main?type=home') {
      return currentActive === '/' || currentActive === '/main?type=home' || currentActive.startsWith('/main?type=home');
    }
    // For other pages, a prefix match is sufficient.
    return currentActive.startsWith(href);
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] bg-white/90 backdrop-blur-xl border-t border-gray-200/50 overflow-hidden dark:bg-gray-900/80 dark:border-gray-700/50'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: 'calc(3.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <ul className='flex items-center overflow-x-auto scrollbar-hide'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li
              key={item.href}
              className='flex-shrink-0'
              style={{ width: '20vw', minWidth: '20vw' }}
            >
              <Link
                href={item.href}
                prefetch={true}
                className='flex flex-col items-center justify-center w-full h-14 gap-1 text-xs'
              >
                <item.icon
                  className={`h-6 w-6 ${active
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                    }`}
                />
                <span
                  className={
                    active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
