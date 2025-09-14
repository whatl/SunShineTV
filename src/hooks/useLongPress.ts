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

    const wasLongPress = isLongPress.current;
    const shouldClick = !wasLongPress && !wasButton.current && onClick && isActive.current;

    if (shouldClick) {
      onClick();
    }

    // 如果这是一次长按的结束，我们需要精确地捕获并阻止那一次“幻影点击”。
    if (wasLongPress) {
      const swallowPhantomClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      };
      window.addEventListener('click', swallowPhantomClick, { capture: true, once: true });

      // 双保险安全网：设置一个极短的超时。
      // 如果幻影点击从未发生，这个超时会负责清理掉监听器，
      // 防止它意外地“吞掉”用户后续的真实点击。
      setTimeout(() => {
        window.removeEventListener('click', swallowPhantomClick, true);
      }, 150); // 150ms 足够捕获绝大多数幻影点击，同时足够短以避免干扰真实操作。
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