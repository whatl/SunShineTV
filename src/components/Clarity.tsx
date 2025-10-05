/**
 * Microsoft Clarity 集成组件
 *
 * Clarity 是微软提供的免费网站分析工具，提供：
 * - 用户会话回放
 * - 点击热图
 * - 滚动热图
 * - 用户行为分析
 *
 * 使用方法：
 * 1. 访问 https://clarity.microsoft.com 创建项目
 * 2. 获取项目 ID（Project ID）
 * 3. 在 .env 文件中设置：NEXT_PUBLIC_CLARITY_ID=你的项目ID
 * 4. 重启应用
 *
 * 注意：
 * - 如果未设置 CLARITY_ID，组件会自动跳过加载
 * - 使用 afterInteractive 策略确保不影响页面加载性能
 * - 仅在客户端运行
 */

'use client';

import Script from 'next/script';

export function Clarity() {
  // 从环境变量读取 Clarity Project ID
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  // 如果没有配置 ID，不加载 Clarity 脚本
  if (!clarityId) {
    return null;
  }

  // 只在生产环境加载，避免开发环境网络错误
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <Script
      id="microsoft-clarity"
      type="text/javascript"
      // afterInteractive: 页面交互后加载，不阻塞页面渲染
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityId}");
        `,
      }}
    />
  );
}
