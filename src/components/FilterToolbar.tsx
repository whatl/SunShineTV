/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import { useParams } from 'next/navigation';
import React, { useCallback,useEffect, useRef, useState } from 'react';

import MultiLevelSelector from './MultiLevelSelector';
import WeekdaySelector from './WeekdaySelector';

interface SelectorOption {
  label: string;
  value: string;
}

interface FilterToolbarProps {
  onFilterChange: (path: string, extra: Record<string, string>) => void;
}

const FilterToolbar: React.FC<FilterToolbarProps> = ({ onFilterChange }) => {
  const params = useParams();
  const type = params.type as 'movie' | 'tv' | 'show' | 'anime';

  // Internal state for selections
  const [primarySelection, setPrimarySelection] = useState<string>('');
  const [secondarySelection, setSecondarySelection] = useState<string>('');
  const [multiLevelValues, setMultiLevelValues] = useState<Record<string, string>>({});
  const [selectedWeekday, setSelectedWeekday] = useState<string>('');

  // Refs for indicator animations
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{ left: number; width: number; }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{ left: number; width: number; }>({ left: 0, width: 0 });

  // Hardcoded options, same as DoubanSelector
  const moviePrimaryOptions: SelectorOption[] = [ { label: '全部', value: 'all' }, { label: '热门电影', value: 'hot' }, { label: '最新电影', value: 'latest' }, { label: '豆瓣高分', value: 'top_rated' }, { label: '冷门佳片', value: 'unpopular' }, ];
  const movieSecondaryOptions: SelectorOption[] = [ { label: '全部', value: 'all' }, { label: '华语', value: 'chinese' }, { label: '欧美', value: 'western' }, { label: '韩国', value: 'korean' }, { label: '日本', value: 'japanese' }, ];
  const tvPrimaryOptions: SelectorOption[] = [ { label: '全部', value: 'all' }, { label: '最近热门', value: 'hot' }, ];
  const tvSecondaryOptions: SelectorOption[] = [ { label: '全部', value: 'all' }, { label: '国产', value: 'domestic' }, { label: '欧美', value: 'american' }, { label: '日本', value: 'japanese' }, { label: '韩国', value: 'korean' }, { label: '动漫', value: 'animation' }, { label: '纪录片', value: 'documentary' }, ];
  const showPrimaryOptions: SelectorOption[] = [ { label: '全部', value: 'all' }, { label: '最近热门', value: 'hot' }, ];
  const showSecondaryOptions: SelectorOption[] = [ { label: '全部', value: 'all' }, { label: '国内', value: 'domestic' }, { label: '国外', value: 'foreign' }, ];
  const animePrimaryOptions: SelectorOption[] = [ { label: '每日放送', value: 'daily' }, { label: '番剧', value: 'fanju' }, { label: '剧场版', value: 'movie' }, ];

  // Debounce effect for calling onFilterChange
  useEffect(() => {
    const handler = setTimeout(() => {
      // Path is now only two levels: type/primary
      const pathSegments: string[] = [type];
      if (primarySelection) {
        pathSegments.push(primarySelection);
      }
      const path = pathSegments.join('/');

      // Secondary selection and others go into the 'extra' map
      const extra = { ...multiLevelValues };
      if (secondarySelection) {
        extra.category = secondarySelection;
      }
      if (selectedWeekday) {
        extra.weekday = selectedWeekday;
      }

      onFilterChange(path, extra);
    }, 150); // Debounce to avoid rapid firing

    return () => {
      clearTimeout(handler);
    };
  }, [type, primarySelection, secondarySelection, multiLevelValues, selectedWeekday, onFilterChange]);

  // Reset selections when the main type changes
  useEffect(() => {
    if (type === 'movie') { setPrimarySelection('hot'); setSecondarySelection('all'); } 
    else if (type === 'tv') { setPrimarySelection('hot'); setSecondarySelection('all'); } 
    else if (type === 'show') { setPrimarySelection('hot'); setSecondarySelection('all'); } 
    else if (type === 'anime') { setPrimarySelection('daily'); setSecondarySelection(''); }
    setMultiLevelValues({});
    setSelectedWeekday('');
  }, [type]);


  const updateIndicatorPosition = useCallback(( activeIndex: number, containerRef: React.RefObject<HTMLDivElement>, buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>, setIndicatorStyle: React.Dispatch<React.SetStateAction<{ left: number; width: number }>> ) => {
    if ( activeIndex >= 0 && buttonRefs.current[activeIndex] && containerRef.current ) {
      const timeoutId = setTimeout(() => {
        const button = buttonRefs.current[activeIndex];
        const container = containerRef.current;
        if (button && container) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (buttonRect.width > 0) {
            setIndicatorStyle({ left: buttonRect.left - containerRect.left, width: buttonRect.width, });
          }
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Effects to update indicator positions
  useEffect(() => {
    let options: SelectorOption[] = [];
    if (type === 'movie') options = moviePrimaryOptions;
    else if (type === 'tv') options = tvPrimaryOptions;
    else if (type === 'anime') options = animePrimaryOptions;
    else if (type === 'show') options = showPrimaryOptions;
    const activeIndex = options.findIndex(opt => opt.value === primarySelection);
    const cleanup = updateIndicatorPosition( activeIndex, primaryContainerRef, primaryButtonRefs, setPrimaryIndicatorStyle );
    return cleanup;
  }, [primarySelection, type, updateIndicatorPosition]);

  useEffect(() => {
    let options: SelectorOption[] = [];
    if (type === 'movie') options = movieSecondaryOptions;
    else if (type === 'tv') options = tvSecondaryOptions;
    else if (type === 'show') options = showSecondaryOptions;
    const activeIndex = options.findIndex(opt => opt.value === secondarySelection);
    if (options.length > 0) {
      const cleanup = updateIndicatorPosition( activeIndex, secondaryContainerRef, secondaryButtonRefs, setSecondaryIndicatorStyle );
      return cleanup;
    }
  }, [secondarySelection, type, updateIndicatorPosition]);

  const renderCapsuleSelector = ( options: SelectorOption[], activeValue: string | undefined, onChange: (value: string) => void, isPrimary = false ) => {
    const containerRef = isPrimary ? primaryContainerRef : secondaryContainerRef;
    const buttonRefs = isPrimary ? primaryButtonRefs : secondaryButtonRefs;
    const indicatorStyle = isPrimary ? primaryIndicatorStyle : secondaryIndicatorStyle;

    return (
      <div ref={containerRef} className='relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm'>
        {indicatorStyle.width > 0 && (
          <div
            className='absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out'
            style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
          />
        )}
        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => { buttonRefs.current[index] = el; }}
              onClick={() => onChange(option.value)}
              className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100 cursor-default'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      {type === 'movie' && (
        <div className='space-y-3 sm:space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>分类</span>
            <div className='overflow-x-auto'>{renderCapsuleSelector( moviePrimaryOptions, primarySelection, setPrimarySelection, true )}</div>
          </div>
          {primarySelection !== 'all' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>地区</span>
              <div className='overflow-x-auto'>{renderCapsuleSelector( movieSecondaryOptions, secondarySelection, setSecondarySelection, false )}</div>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>筛选</span>
              <div className='overflow-x-auto'><MultiLevelSelector key={`${type}-${primarySelection}`} onChange={setMultiLevelValues} contentType={type} /></div>
            </div>
          )}
        </div>
      )}

      {type === 'tv' && (
         <div className='space-y-3 sm:space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>分类</span>
            <div className='overflow-x-auto'>{renderCapsuleSelector( tvPrimaryOptions, primarySelection, setPrimarySelection, true )}</div>
          </div>
          {primarySelection === 'hot' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>类型</span>
              <div className='overflow-x-auto'>{renderCapsuleSelector( tvSecondaryOptions, secondarySelection, setSecondarySelection, false )}</div>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>筛选</span>
              <div className='overflow-x-auto'><MultiLevelSelector key={`${type}-${primarySelection}`} onChange={setMultiLevelValues} contentType={type} /></div>
            </div>
          )}
        </div>
      )}

      {type === 'anime' && (
        <div className='space-y-3 sm:space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>分类</span>
            <div className='overflow-x-auto'>{renderCapsuleSelector( animePrimaryOptions, primarySelection, setPrimarySelection, true )}</div>
          </div>
          {primarySelection === 'daily' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>星期</span>
              <div className='overflow-x-auto'><WeekdaySelector onWeekdayChange={setSelectedWeekday} /></div>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>筛选</span>
              <div className='overflow-x-auto'>
                <MultiLevelSelector
                  key={`anime-${primarySelection === 'fanju' ? 'tv' : 'movie'}`}
                  onChange={setMultiLevelValues}
                  contentType={`anime-${primarySelection === 'fanju' ? 'tv' : 'movie'}`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {type === 'show' && (
        <div className='space-y-3 sm:space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>分类</span>
            <div className='overflow-x-auto'>{renderCapsuleSelector( showPrimaryOptions, primarySelection, setPrimarySelection, true )}</div>
          </div>
          {primarySelection === 'hot' ? (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>类型</span>
              <div className='overflow-x-auto'>{renderCapsuleSelector( showSecondaryOptions, secondarySelection, setSecondarySelection, false )}</div>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>筛选</span>
              <div className='overflow-x-auto'><MultiLevelSelector key={`${type}-${primarySelection}`} onChange={setMultiLevelValues} contentType={type} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterToolbar;