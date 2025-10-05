import React from 'react';

// 图片占位符组件 - 静态骨架屏（支持暗色模式）
const ImagePlaceholder = React.memo(({ aspectRatio }: { aspectRatio: string }) => {
  return (
    <div
      className={`w-full ${aspectRatio} rounded-lg bg-gray-200 dark:bg-gray-700`}
    />
  );
});

// 添加 displayName 用于调试
ImagePlaceholder.displayName = 'ImagePlaceholder';

export { ImagePlaceholder };
