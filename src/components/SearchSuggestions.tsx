'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSuggestions } from '@/lib/dataProvider';

interface SearchSuggestionsProps {
  query: string;
  isVisible: boolean;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  onEnterKey: () => void;
  hasContent?: boolean; // 搜索框是否有内容
}

interface SuggestionItem {
  text: string;
  type: 'exact' | 'related' | 'suggestion';
  score?: number;
}

export default function SearchSuggestions({
  query,
  isVisible,
  onSelect,
  onClose,
  onEnterKey,
  hasContent = false,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 防抖定时器
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 用于中止旧请求
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestionsFromAPI = useCallback(async (searchQuery: string) => {
    // 每次请求前取消上一次的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 使用 dataProvider 的 getSuggestions 方法
      // 传入搜索词获取建议，传入空字符串获取热搜
      const results = await getSuggestions(searchQuery);

      // 检查是否被中止
      if (controller.signal.aborted) {
        return;
      }

      setSuggestions(results);
    } catch (err: unknown) {
      // 类型保护判断 err 是否是 Error 类型
      if (err instanceof Error) {
        if (err.name !== 'AbortError') {
          // 不是取消请求导致的错误才清空
          setSuggestions([]);
        }
      } else {
        // 如果 err 不是 Error 类型，也清空提示
        setSuggestions([]);
      }
    }
  }, []);

  // 防抖触发
  const debouncedFetchSuggestions = useCallback(
    (searchQuery: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // 如果有内容，防抖300ms
      const delay = 300;

      debounceTimer.current = setTimeout(() => {
        if (isVisible) {
          fetchSuggestionsFromAPI(searchQuery);
        }
      }, delay);
    },
    [isVisible, fetchSuggestionsFromAPI]
  );

  useEffect(() => {
    if (!isVisible) {
      setSuggestions([]);
      return;
    }

    // 根据是否有查询内容来决定获取建议还是热搜
    debouncedFetchSuggestions(query.trim());

    // 清理定时器
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, isVisible, debouncedFetchSuggestions]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  // 处理键盘事件，特别是回车键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isVisible) {
        // 阻止默认行为，避免浏览器自动选择建议
        e.preventDefault();
        e.stopPropagation();
        // 关闭搜索建议并触发搜索
        onClose();
        onEnterKey();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown, true);
    }

    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isVisible, onClose, onEnterKey]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  // 判断是否显示热搜（query为空或只有空格）
  const isHotSearch = !query.trim();

  return (
    <div
      ref={containerRef}
      className='absolute left-0 right-0 z-[600] bg-gray-50 dark:bg-gray-800 shadow-lg rounded-3xl mt-2 pt-4 pb-4 px-4'
    >
      {/* 两列网格布局 */}
      <div className='grid grid-cols-2 gap-2'>
        {suggestions.slice(0, 8).map((item, index) => (
          <button
            key={`suggestion-${index}-${item.text}`}
            onClick={() => onSelect(item.text)}
            className='flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200 text-left'
          >
            {/* 显示序号，热搜前3个带颜色 */}
            <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
              isHotSearch && index === 0 ? 'text-red-500' :
              isHotSearch && index === 1 ? 'text-orange-500' :
              isHotSearch && index === 2 ? 'text-yellow-500' :
              'text-gray-400'
            }`}>
              {index + 1}
            </span>
            <span className='flex-1 truncate'>{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
