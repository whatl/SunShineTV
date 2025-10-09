/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Cat, Clover, Film, Home, Menu, Search, Star, Tv, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import { supportedCategories } from '@/lib/dataProvider';

import { useSite } from './SiteProvider';

interface SidebarContextType {
  isCollapsed: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
});

export const useSidebar = () => useContext(SidebarContext);

const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      className='flex items-center justify-center h-16 select-none hover:opacity-80 transition-opacity duration-200'
    >
      <span
        data-sidebar-text
        className='text-2xl font-bold text-green-600 tracking-tight whitespace-nowrap'
      >
        {siteName}
      </span>
    </Link>
  );
};

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
  activePath?: string;
}


const Sidebar = ({ onToggle, activePath = '/' }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 读取初始状态
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const htmlCollapsed = document.documentElement.dataset.sidebarCollapsed;
      return htmlCollapsed === 'true';
    }
    return false;
  });

  // 初始化和状态变化时同步
  useLayoutEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = isCollapsed ? 'true' : 'false';
    // 只在首次挂载时标记 JS 已准备好
    if (!document.documentElement.hasAttribute('data-js-ready')) {
      document.documentElement.setAttribute('data-js-ready', 'true');
    }
  }, [isCollapsed]);

  // ============================================
  // 侧边栏激活状态的优先级（从高到低）
  // ============================================
  // 1. URL 参数 as（简化的数字 ID，如 as=1 表示首页）
  // 2. activePath prop（PageLayout 传入）
  // 3. 当前 URL 路径（默认行为）

  // ID 到路径的映射
  const SIDEBAR_MAP: Record<string, string> = {
    '1': '/',
    '2': '/search',
    '3': '/main?type=movie',
    '4': '/main?type=tv',
    '5': '/main?type=anime',
    '6': '/main?type=show',
    '7': '/main?type=drama',
    '8': '/douban?type=custom',
    '9': '/live',
  };

  // 初始化时就计算正确的激活状态，避免闪烁
  const getInitialActive = () => {
    const sidebarId = searchParams.get('as');
    if (sidebarId && SIDEBAR_MAP[sidebarId]) {
      return SIDEBAR_MAP[sidebarId];
    }
    if (activePath) {
      return activePath;
    }
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  const [active, setActive] = useState(getInitialActive);

  useEffect(() => {
    const sidebarId = searchParams.get('as');

    if (sidebarId && SIDEBAR_MAP[sidebarId]) {
      setActive(SIDEBAR_MAP[sidebarId]);
    } else if (activePath) {
      setActive(activePath);
    } else {
      const queryString = searchParams.toString();
      const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
      setActive(fullPath);
    }
  }, [activePath, pathname, searchParams]);

  const handleToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    document.cookie = `sc=${newState ? '1' : '0'}; path=/; max-age=31536000`;
    onToggle?.(newState);
  }, [isCollapsed, onToggle]);

  const handleSearchClick = useCallback(() => {
    router.push('/search');
  }, [router]);

  const contextValue = {
    isCollapsed,
  };

  const [menuItems, setMenuItems] = useState(() => {
    const items = [
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
      setMenuItems(prev => [...prev, {
        icon: Star,
        label: '自定义',
        // Note: The 'custom' category might need a special page or logic.
        // For now, it points to the old structure, which will redirect.
        href: '/douban?type=custom',
      }]);
    }
  }, []);

  return (
    <SidebarContext.Provider value={contextValue}>
      {/* 在移动端隐藏侧边栏 */}
      <div className='hidden md:flex'>
        <aside
          data-sidebar
          className='fixed top-0 left-0 h-screen bg-white/40 backdrop-blur-xl transition-all duration-300 border-r border-gray-200/50 z-10 shadow-lg dark:bg-gray-900/70 dark:border-gray-700/50 w-64'
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className='flex h-full flex-col'>
            {/* 顶部 Logo 区域 */}
            <div className='relative h-16'>
              <div className='absolute inset-0 flex items-center justify-center'>
                <Logo />
              </div>
              <button
                onClick={handleToggle}
                className='absolute top-1/2 -translate-y-1/2 right-2 flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 transition-colors duration-200 z-10 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                data-sidebar-toggle
              >
                <Menu className='h-4 w-4' />
              </button>
            </div>

            {/* 首页和搜索导航 */}
            <nav className='px-2 mt-4 space-y-1'>
              <Link
                href='/'
                onClick={() => setActive('/')}
                data-active={active === '/'}
                className='group flex items-center rounded-lg px-2 py-2 pl-4 text-gray-700 hover:bg-gray-100/30 hover:text-green-600 data-[active=true]:bg-green-500/20 data-[active=true]:text-green-700 font-medium transition-colors duration-200 min-h-[40px] dark:text-gray-300 dark:hover:text-green-400 dark:data-[active=true]:bg-green-500/10 dark:data-[active=true]:text-green-400 mx-0 gap-3 justify-start'
              >
                <div className='w-4 h-4 flex items-center justify-center'>
                  <Home className='h-4 w-4 text-gray-500 group-hover:text-green-600 data-[active=true]:text-green-700 dark:text-gray-400 dark:group-hover:text-green-400 dark:data-[active=true]:text-green-400' />
                </div>
                <span data-sidebar-text className='whitespace-nowrap transition-opacity duration-200'>
                  首页
                </span>
              </Link>
              <Link
                href='/search'
                onClick={(e) => {
                  e.preventDefault();
                  handleSearchClick();
                  setActive('/search');
                }}
                data-active={active === '/search'}
                className='group flex items-center rounded-lg px-2 py-2 pl-4 text-gray-700 hover:bg-gray-100/30 hover:text-green-600 data-[active=true]:bg-green-500/20 data-[active=true]:text-green-700 font-medium transition-colors duration-200 min-h-[40px] dark:text-gray-300 dark:hover:text-green-400 dark:data-[active=true]:bg-green-500/10 dark:data-[active=true]:text-green-400 mx-0 gap-3 justify-start'
              >
                <div className='w-4 h-4 flex items-center justify-center'>
                  <Search className='h-4 w-4 text-gray-500 group-hover:text-green-600 data-[active=true]:text-green-700 dark:text-gray-400 dark:group-hover:text-green-400 dark:data-[active=true]:text-green-400' />
                </div>
                <span data-sidebar-text className='whitespace-nowrap transition-opacity duration-200'>
                  搜索
                </span>
              </Link>
            </nav>

            {/* 菜单项 */}
            <div className='flex-1 overflow-y-auto px-2 pt-4'>
              <div className='space-y-1'>
                {menuItems.map((item) => {
                  const decodedActive = decodeURIComponent(active);
                  const decodedItemHref = decodeURIComponent(item.href);

                  let isActive = false;
                  // For the homepage, we need an exact match.
                  if (decodedItemHref === '/') {
                    isActive = decodedActive === '/';
                  } else {
                    // For other pages, a prefix match is sufficient.
                    isActive = decodedActive.startsWith(decodedItemHref);
                  }

                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setActive(item.href)}
                      data-active={isActive}
                      className='group flex items-center rounded-lg px-2 py-2 pl-4 text-sm text-gray-700 hover:bg-gray-100/30 hover:text-green-600 data-[active=true]:bg-green-500/20 data-[active=true]:text-green-700 transition-colors duration-200 min-h-[40px] dark:text-gray-300 dark:hover:text-green-400 dark:data-[active=true]:bg-green-500/10 dark:data-[active=true]:text-green-400 mx-0 gap-3 justify-start'
                    >
                      <div className='w-4 h-4 flex items-center justify-center'>
                        <Icon className='h-4 w-4 text-gray-500 group-hover:text-green-600 data-[active=true]:text-green-700 dark:text-gray-400 dark:group-hover:text-green-400 dark:data-[active=true]:text-green-400' />
                      </div>
                      <span data-sidebar-text className='whitespace-nowrap transition-opacity duration-200'>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
        <div
          className='transition-all duration-300 sidebar-offset w-64'
        ></div>
      </div>
    </SidebarContext.Provider>
  );
};

export default Sidebar;
