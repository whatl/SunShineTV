'use client';

import { createContext, ReactNode, useContext } from 'react';

interface FooterLink {
  name: string;
  url: string;
}

interface SiteContextType {
  siteName: string;
  announcement?: string;
  footerText?: string;
  footerLinks?: FooterLink[];
}

const SiteContext = createContext<SiteContextType>({ // 可以理解为前端兜底默认值，一般不会用到
  // 默认值
  siteName: 'SunShineTV',
  announcement:
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
  footerText:
    '本站所有视频和图片均来自互联网收集而来，版权归原创者所有，本网站只提供web页面服务，并不提供资源存储，也不参与录制、上传。若本站收录的节目无意侵犯了贵司版权，请发邮件至google#gmail.com（#换成@）',
  footerLinks: [],
});

export const useSite = () => useContext(SiteContext);

export function SiteProvider({
  children,
  siteName,
  announcement,
  footerText,
  footerLinks,
}: {
  children: ReactNode;
  siteName: string;
  announcement?: string;
  footerText?: string;
  footerLinks?: FooterLink[];
}) {
  return (
    <SiteContext.Provider value={{
      siteName,
      announcement,
      footerText,
      footerLinks: footerLinks
    }}>
      {children}
    </SiteContext.Provider>
  );
}
