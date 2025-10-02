'use client';

import { useSite } from './SiteProvider';

export function Footer() {
  const { footerText, footerLinks } = useSite();

  // 如果文本和链接都为空，不渲染任何内容
  const hasLinks = footerLinks && footerLinks.length > 0;
  const hasText = footerText && footerText.trim() !== '';

  if (!hasLinks && !hasText) {
    return null;
  }

  return (
    <footer className='w-full'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* 链接区域 */}
        {hasLinks && (
          <div className='flex flex-wrap justify-center items-center gap-x-2 gap-y-1 sm:gap-x-3 mb-2'>
            {footerLinks.map((link, index) => {
              const hasUrl = link.url && link.url.trim() !== '';
              const isInternalLink = hasUrl && link.url.startsWith('/');

              return (
                <a
                  key={index}
                  href={hasUrl ? link.url : '#'}
                  target={hasUrl && !isInternalLink ? '_blank' : undefined}
                  rel={hasUrl && !isInternalLink ? 'noopener noreferrer' : undefined}
                  onClick={(e) => {
                    if (!hasUrl) {
                      e.preventDefault();
                    }
                  }}
                  className='text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200'
                >
                  {link.name}
                </a>
              );
            })}
          </div>
        )}

        {/* 版权说明 */}
        {hasText && (
          <div className='text-center'>
            <p className='text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-4xl mx-auto'>
              {footerText}
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
