import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  longPressDelay?: number;
  moveThreshold?: number;
}

interface TouchPosition {
  x: number;
  y: number;
}

export const useLongPress = ({
  onLongPress,
  onClick,
  longPressDelay = 500,
  moveThreshold = 10,
}: UseLongPressOptions) => {
  const isLongPress = useRef(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<TouchPosition | null>(null);
  const isActive = useRef(false); // 防止重复触发
  const wasButton = useRef(false); // 记录触摸开始时是否是按钮

  const clearTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleStart = useCallback(
    (clientX: number, clientY: number, isButton = false) => {
      if (isActive.current) {
        return;
      }

      isActive.current = true;
      isLongPress.current = false;
      startPosition.current = { x: clientX, y: clientY };
      wasButton.current = isButton;

      pressTimer.current = setTimeout(() => {
        if (!isActive.current) return;

        isLongPress.current = true;

        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        onLongPress();
        // 解决Iphone PWA抬起弹出框消失问题（By AI）
        // 关键修复：在长按触发后，临时设置一个全局的点击捕获器
        // 来“吞掉”touchend后浏览器合成的那个“幽灵点击”事件。
        const swallowPhantomClick = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          // 监听到点击后，立即自我移除
          window.removeEventListener('click', swallowPhantomClick, true);
        };
        // 使用捕获模式确保尽早拦截
        window.addEventListener('click', swallowPhantomClick, { capture: true });

        // 安全网：设置一个短暂的超时，以防“幻影点击”从未发生。
        // 这可以防止监听器永久存在，从而干扰后续的真实用户点击。
        // 100毫秒的延迟足以捕获大多数幻影点击，同时又足够短，不会影响用户体验。
        setTimeout(() => {
          // 如果监听器仍然存在（即幻影点击未发生），则将其移除。
          // 多次调用 removeEventListener 是安全的。
          window.removeEventListener('click', swallowPhantomClick, true);
        }, 100);
      }, longPressDelay);
    },
    [onLongPress, longPressDelay]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!startPosition.current || !isActive.current) return;

      const distance = Math.sqrt(
        Math.pow(clientX - startPosition.current.x, 2) +
        Math.pow(clientY - startPosition.current.y, 2)
      );

      if (distance > moveThreshold) {
        clearTimer();
        isActive.current = false;
      }
    },
    [clearTimer, moveThreshold]
  );

  const handleEnd = useCallback(() => {
    clearTimer();

    const shouldClick = !isLongPress.current && !wasButton.current && onClick && isActive.current;

    if (shouldClick) {
      onClick();
    }

    isLongPress.current = false;
    startPosition.current = null;
    isActive.current = false;
    wasButton.current = false;
  }, [clearTimer, onClick]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const target = e.target as HTMLElement;
      const buttonElement = target.closest('[data-button]');

      const isDirectButton = target.hasAttribute('data-button');
      const isButton = !!buttonElement && isDirectButton;

      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, !!isButton);
    },
    [handleStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleEnd();
    },
    [handleEnd]
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};