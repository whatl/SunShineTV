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
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0c111c' : '#f9fbfe';
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', theme === 'dark' ? '#0c111c' : '#f9fbfe');
    }
  };

  useEffect(() => {
    if (resolvedTheme) {
      setThemeColor(resolvedTheme);
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
