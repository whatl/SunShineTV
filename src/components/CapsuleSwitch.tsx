/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface CapsuleSwitchProps {
  options: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

const CapsuleSwitch: React.FC<CapsuleSwitchProps> = ({
  options,
  active,
  onChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // 初始化为0，让CSS处理初始状态
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  const activeIndex = options.findIndex((opt) => opt.value === active);

  // 更新指示器位置
  const updateIndicatorPosition = () => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const button = buttonRefs.current[activeIndex];
      const container = containerRef.current;
      if (button && container) {
        const buttonRect = button.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (buttonRect.width > 0) {
          setIndicatorStyle({
            left: buttonRect.left - containerRect.left,
            width: buttonRect.width,
          });
          setIsPositioned(true);
        }
      }
    }
  };

  // 使用 useLayoutEffect 在浏览器绘制前更新
  useLayoutEffect(() => {
    updateIndicatorPosition();
  }, [activeIndex]);

  // 窗口大小变化时重新计算
  useEffect(() => {
    const handleResize = () => updateIndicatorPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex bg-gray-300/80 rounded-full p-1 dark:bg-gray-700 ${
        className || ''
      }`}
    >
      {/* 滑动的白色背景指示器 */}
      {!isPositioned && (
        // 初始渲染时的指示器，使用百分比定位更安全
        <div
          className='absolute top-1 bottom-1 left-1 w-16 sm:w-20 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-none'
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {isPositioned && (
        // 计算完成后的精确定位
        <div
          className='absolute top-1 bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out'
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      )}

      {options.map((opt, index) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 w-16 px-3 py-1 text-xs sm:w-20 sm:py-2 sm:text-sm rounded-full font-medium transition-all duration-200 cursor-pointer ${
              isActive
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default CapsuleSwitch;
