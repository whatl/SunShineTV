/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { flushSync } from 'react-dom';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const setThemeColor = (theme?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    // 状态栏颜色匹配 MobileHeader 的半透明毛玻璃效果的近似实色
    const themeColor = theme === 'dark' ? '#0c111c' : '#f9fbfe';
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', themeColor);
    }
  };

  useEffect(() => {
    if (resolvedTheme) {
      setThemeColor(resolvedTheme);
      // 同步主题到 cookie（简写版本），确保 SSR 时能读取正确的主题
      // dark → d, light → l, system → s
      const shortTheme = resolvedTheme === 'dark' ? 'd' : resolvedTheme === 'light' ? 'l' : 's';
      document.cookie = `thm=${shortTheme}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [resolvedTheme]);

  const toggleTheme = () => {
    // 检查浏览器是否支持 View Transitions API
    const targetTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeColor(targetTheme);
    if (!(document as any).startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      flushSync(() => {
        setTheme(targetTheme);
      });
    });
  };
  // 同时渲染两个按钮（这样不用改变dom），用透明度来改变防止闪烁
  return (
    <button
      onClick={toggleTheme}
      className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors relative'
      aria-label='Toggle theme'
    >
      <Sun className='w-full h-full absolute inset-0 p-2 opacity-0 dark:opacity-100 transition-opacity duration-200' />
      <Moon className='w-full h-full absolute inset-0 p-2 opacity-100 dark:opacity-0 transition-opacity duration-200' />
    </button>
  );
}
