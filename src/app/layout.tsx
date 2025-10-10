/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';

import './globals.css';

import { getConfig } from '@/lib/config';

import { AuthProvider } from '@/components/AuthProvider';
import { Clarity } from '@/components/Clarity';

import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

// ============================================
// 优化3 已移除: export const dynamic = 'force-dynamic'
// ============================================
// 原配置会强制所有页面动态渲染，禁用所有缓存，导致：
// ❌ 每次访问都重新生成页面
// ❌ 无法使用 ISR（增量静态再生成）
// ❌ 阻止浏览器 bfcache
// ❌ 性能严重下降
//
// 解决方案：
// 1. 需要动态的页面单独设置（在页面级别而非全局）
// 2. 使用 revalidate 控制缓存策略
// 3. 使用 next.config.js 的 staleTimes 配置路由缓存

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const config = await getConfig();
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'SunShineTV';
  if (storageType !== 'localstorage') {
    siteName = config.SiteConfig.SiteName;
  }

  return {
    title: siteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const notLocalStorage = storageType !== 'localstorage'
  // 非本地存储从配置读取
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'SunShineTV';
  let announcement = !notLocalStorage ? process.env.ANNOUNCEMENT || '' : '';
  let footerText = !notLocalStorage ? process.env.FOOTER_TEXT || '' : '';
  let footerLinks: { name: string; url: string }[] = [];
  let contactEmail = '';
  let contactTwitter = '';
  let contactQQ = '';
  let contactTelegram = '';
  let copyrightEmail = '';

  let doubanProxyType = process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent';
  let doubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  let doubanImageProxyType =
    process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE || 'cmliussss-cdn-tencent';
  let doubanImageProxy = process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '';
  let disableYellowFilter =
    process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true';
  let fluidSearch = process.env.NEXT_PUBLIC_FLUID_SEARCH === 'true';
  let customCategories = [] as {
    name: string;
    type: 'movie' | 'tv';
    query: string;
  }[];
  if (notLocalStorage) { // 不是本地存储才有
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
    announcement = config.SiteConfig.Announcement;
    footerText = config.SiteConfig.FooterText || footerText;
    footerLinks = config.SiteConfig.FooterLinks || footerLinks;
    contactEmail = config.SiteConfig.ContactEmail || '';
    contactTwitter = config.SiteConfig.ContactTwitter || '';
    contactQQ = config.SiteConfig.ContactQQ || '';
    contactTelegram = config.SiteConfig.ContactTelegram || '';
    copyrightEmail = config.SiteConfig.CopyrightEmail || '';

    doubanProxyType = config.SiteConfig.DoubanProxyType;
    doubanProxy = config.SiteConfig.DoubanProxy;
    doubanImageProxyType = config.SiteConfig.DoubanImageProxyType;
    doubanImageProxy = config.SiteConfig.DoubanImageProxy;
    disableYellowFilter = config.SiteConfig.DisableYellowFilter;
    customCategories = config.CustomCategories.filter(
      (category) => !category.disabled
    ).map((category) => ({
      name: category.name || '',
      type: category.type,
      query: category.query,
    }));
    fluidSearch = config.SiteConfig.FluidSearch;
  }

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    DOUBAN_PROXY_TYPE: doubanProxyType,
    DOUBAN_PROXY: doubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: doubanImageProxyType,
    DOUBAN_IMAGE_PROXY: doubanImageProxy,
    DISABLE_YELLOW_FILTER: disableYellowFilter,
    CUSTOM_CATEGORIES: customCategories,
    FLUID_SEARCH: fluidSearch,
  };

  // 在服务端获取认证信息
  let authInfo = null;
  const authCookie = cookies().get('auth');
  if (authCookie) {
    try {
      const decoded = decodeURIComponent(authCookie.value);
      authInfo = JSON.parse(decoded);
    } catch (error) {
      // 解析失败则视为未登录
      authInfo = null;
    }
  }

  // 读取侧边栏折叠状态 (sc = sidebar collapsed)
  const cookieStore = cookies();
  const sidebarCollapsedCookie = cookieStore.get('sc');
  const sidebarCollapsed = sidebarCollapsedCookie?.value === '1';

  // 读取主题 Cookie，在 SSR 时就确定背景色
  // Cookie 简写：thm=d (dark) | l (light) | s (system)
  const themeCookie = cookieStore.get('thm');
  const savedThemeShort = themeCookie?.value; // 'd' | 'l' | 's' | undefined

  // 状态栏颜色应匹配 MobileHeader 的背景色
  // MobileHeader: bg-white/70 (浅色) | dark:bg-gray-900/70 (深色)
  // 使用原来的颜色值（已经过调校）
  const statusBarColor = savedThemeShort === 'd' ? '#0c111c' : '#f9fbfe'; // d=dark, l=light, s=system
  const themeClass = savedThemeShort === 'd' ? 'dark' : '';

  return (
    <html
      lang='zh-CN'
      suppressHydrationWarning
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      className={themeClass}
    >
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        {/* 状态栏颜色匹配 MobileHeader 背景色 */}
        <meta name='theme-color' content={statusBarColor} />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200`}
      >
        <Clarity />
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider value={authInfo}>
            <SiteProvider
              siteName={siteName}
              announcement={announcement}
              footerText={footerText}
              footerLinks={footerLinks}
              contactEmail={contactEmail}
              contactTwitter={contactTwitter}
              contactQQ={contactQQ}
              contactTelegram={contactTelegram}
              copyrightEmail={copyrightEmail}
            >
              {children}
              <GlobalErrorIndicator />
            </SiteProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
