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
      console.log('[LongPress] Timer cleared.');
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleStart = useCallback(
    (clientX: number, clientY: number, isButton = false) => {
      console.log(`[LongPress] handleStart triggered. isActive was: ${isActive.current}`);
      if (isActive.current) {
        console.log('[LongPress] handleStart ignored: gesture already active.');
        return;
      }

      isActive.current = true;
      isLongPress.current = false;
      startPosition.current = { x: clientX, y: clientY };
      wasButton.current = isButton;
      console.log(`[LongPress] New gesture started. isButton: ${isButton}`);

      pressTimer.current = setTimeout(() => {
        console.log(`[LongPress] setTimeout triggered. isActive is: ${isActive.current}`);
        if (!isActive.current) return;

        isLongPress.current = true;
        console.log('[LongPress] Long press SUCCESSFUL.');

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
        console.log('[LongPress] Gesture cancelled due to movement.');
        clearTimer();
        isActive.current = false;
      }
    },
    [clearTimer, moveThreshold]
  );

  const handleEnd = useCallback(() => {
    console.log(`[LongPress] handleEnd triggered. isLongPress: ${isLongPress.current}, isActive: ${isActive.current}`);
    clearTimer();

    const shouldClick = !isLongPress.current && !wasButton.current && onClick && isActive.current;
    console.log(`[LongPress] shouldClick determined to be: ${shouldClick}`);

    if (shouldClick) {
      console.log('[LongPress] onClick triggered.');
      onClick();
    }

    console.log('[LongPress] Resetting state.');
    isLongPress.current = false;
    startPosition.current = null;
    isActive.current = false;
    wasButton.current = false;
  }, [clearTimer, onClick]);

  // 触摸事件处理器
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      console.log(`[LongPress] onTouchStart event. Touches: ${e.touches.length}`);
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
      console.log(`[LongPress] onTouchEnd event. Touches: ${e.touches.length}`);
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
