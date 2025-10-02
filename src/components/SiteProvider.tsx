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

const SiteContext = createContext<SiteContextType>({
  // 默认值
  siteName: 'SunShineTV',
  announcement:
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
  footerText:
    '本站所有视频和图片均来自互联网收集而来，版权归原创者所有，本网站只提供web页面服务，并不提供资源存储，也不参与录制、上传。若本站收录的节目无意侵犯了贵司版权，请发邮件至chuichui#gmail.com（#换成@）',
  footerLinks: [
    { name: "Baidu", url: "https://www.baidu.com" },
    { name: "Google", url: "https://www.google.com" },
    { name: "So", url: "https://www.so.com" },
    { name: "Bing", url: "https://www.bing.com" },
    { name: "Sogou", url: "https://www.sogou.com" },
    { name: "Sm", url: "https://www.sm.cn" },
    { name: "Telegram群", url: "" },
    { name: "问答", url: "https://your-qa-site.com" },
    { name: "商务合作", url: "" }
  ],
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
