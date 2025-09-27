
// src/components/SafeHtmlRenderer.tsx
'use client';

import DOMPurify from 'dompurify';
import React, { memo, useMemo } from 'react';

interface SafeHtmlRendererProps {
  htmlContent: string;
  className?: string;
}

// Regular expression to check for the presence of any HTML tag.
const htmlRegex = /<[a-z][\s\S]*>/i;

const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({ htmlContent, className }) => {
  const isHtml = useMemo(() => htmlRegex.test(htmlContent), [htmlContent]);

  if (isHtml) {
    // 配置那些标签可用，可以去掉不想要的效果（By Faker）
    // If the content is HTML, sanitize it and render.
    // DOMPurify is configured to be extra cautious, allowing only basic formatting.
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: ['b', 'i', 'u', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      FORBID_TAGS: ['span'], //span返回的样式和网站不搭配禁止
    });

    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  // If the content is plain text, render it in a way that preserves line breaks.
  return (
    <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {htmlContent}
    </p>
  );
};

export default memo(SafeHtmlRenderer);
