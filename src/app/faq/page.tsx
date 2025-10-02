'use client';

import { ChevronDown, ChevronUp, Copy, Send,X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import PageLayout from '@/components/PageLayout';
import { useSite } from '@/components/SiteProvider';
import { submitFeedback, getCaptcha } from '@/lib/dataProvider';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

// 反馈对话框组件
function FeedbackModal({
  isOpen,
  onClose,
  title,
  placeholder,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  type: number;
}) {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captchaImage, setCaptchaImage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // 获取验证码
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      // 如果已有sessionId，传递给后端以便移除旧的
      const captchaData = await getCaptcha(sessionId || undefined);
      setCaptchaImage(captchaData.imageBase64);
      setSessionId(captchaData.sessionId);
      setUserAnswer('');
    } catch (error) {
      console.error('获取验证码失败:', error);
      alert('获取验证码失败，请重试');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 组件打开时获取验证码
  useEffect(() => {
    if (isOpen) {
      loadCaptcha();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    // 验证码校验（前端简单校验）
    if (!userAnswer.trim()) {
      alert('请输入验证码');
      return;
    }

    if (userAnswer.trim().length !== 4) {
      alert('请输入4位验证码');
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitFeedback(
        type,
        content.trim(),
        sessionId,
        userAnswer.trim(),
        email.trim() || undefined
      );

      if (data.code === 200) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setContent('');
          setEmail('');
          setUserAnswer('');
          onClose();
        }, 1500);
      } else {
        // 显示后端返回的具体错误信息
        alert(data.message || '提交失败，请稍后重试');
        // 只有验证码相关错误（401）才刷新验证码
        if (data.code === 401) {
          loadCaptcha();
        }
      }
    } catch (error: any) {
      console.error('提交失败:', error);
      alert('网络错误，请检查网络连接');
      loadCaptcha(); // 网络错误时刷新验证码
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setEmail('');
    setSubmitted(false);
    setUserAnswer('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 标题 */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-green-600 dark:text-green-400">
              提交成功！
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              感谢您的反馈，我们会尽快处理
            </p>
          </div>
        ) : (
          <>
            {/* 内容输入 */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => {
                  const text = e.target.value;
                  if (text.length <= 70) {
                    setContent(text);
                  }
                }}
                placeholder={placeholder}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {content.length}/70
              </div>
            </div>

            {/* 邮箱输入 */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                联系邮箱（选填）
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
              />
            </div>

            {/* 验证码 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                验证码 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3 w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="请输入4位数字"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                />
                <button
                  type="button"
                  onClick={loadCaptcha}
                  disabled={captchaLoading}
                  className="flex items-center justify-center min-w-[90px] h-[36px] flex-shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-700"
                  title="点击换一个"
                >
                  {captchaLoading ? (
                    <span className="text-sm text-gray-500">加载中...</span>
                  ) : captchaImage ? (
                    <img
                      src={captchaImage}
                      alt="验证码"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-gray-500">点击获取</span>
                  )}
                </button>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || !userAnswer.trim() || submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 分享组件
function ShareSection() {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.origin);
    }
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 使用 qrcode.react.js.cn API 生成二维码
  const qrCodeUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`
    : '';

  return (
    <div className="space-y-4">
      <p className="font-medium text-green-700 dark:text-green-400">
        将网站分享给朋友，一起享受精彩内容：
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-shrink-0">
          <div className="bg-white p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="网站二维码"
                className="w-[200px] h-[200px] block"
              />
            ) : (
              <div className="w-[200px] h-[200px] bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400">加载中...</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            扫码访问
          </p>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              网址链接：
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
              />
              <button
                onClick={handleCopyUrl}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors duration-200 flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">{copied ? '已复制' : '复制'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              分享方式：
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>扫描二维码直接访问</li>
              <li>复制链接发送给朋友</li>
              <li>在社交平台分享网址</li>
              <li>推荐安装为桌面应用使用更方便</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const faqData: FAQItem[] = [
  {
    question: '如何向他人分享本站？',
    answer: <ShareSection />,
  },
  {
    question: '如何安装到桌面（PWA）？',
    answer: (
      <div className="space-y-2">
        <p className="font-medium text-green-700 dark:text-green-400">将本站添加到桌面，像App一样使用：</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">iOS (iPhone/iPad)：</p>
            <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
              <li>打开 Safari 浏览器访问本站</li>
              <li>点击底部分享按钮（方框带向上箭头）</li>
              <li>向下滑动，选择"添加到主屏幕"</li>
              <li>点击"添加"完成安装</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">Android：</p>
            <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
              <li>使用 Chrome 浏览器访问本站</li>
              <li>点击右上角菜单（三个点）</li>
              <li>选择"添加到主屏幕"或"安装应用"</li>
              <li>确认安装即可</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">桌面浏览器（Chrome/Edge）：</p>
            <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
              <li>访问本站后，地址栏会显示安装图标</li>
              <li>点击安装图标或在菜单中选择"安装"</li>
              <li>确认后即可在桌面使用</li>
            </ol>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          ✨ 安装后可以离线缓存，加载更快，体验更流畅
        </p>
      </div>
    ),
  },
  {
    question: '找不到想看的影片怎么办？',
    answer: 'RequestMovieSection',
  },
  {
    question: '为什么有些视频无法播放？',
    answer: (
      <div className="space-y-2">
        <p>可能的原因：</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>视频源失效或维护中</li>
          <li>网络连接不稳定</li>
          <li>浏览器不支持该视频格式</li>
        </ul>
        <p className="mt-2">建议：尝试切换不同的播放线路或刷新页面重试。</p>
      </div>
    ),
  },
  {
    question: '视频广告相关问题？',
    answer: (
      <div className="space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          本站自身不设置任何广告。您在观看时可能遇到的水印或插播广告，均来自视频源提供方，与本站无关。我们推荐您优先选择"蓝光"线路以获得更好的观影体验。
        </p>
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
          <p className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            重要声明
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            请务必不要相信视频中出现的任何广告，特别是涉及赌博、投资等内容。这些通常是诈骗，请保持警惕。享受免费观影的同时，请保护好您的财产安全。
          </p>
        </div>
      </div>
    ),
  },
  {
    question: '网站的视频来源是什么？',
    answer: '本站所有视频和图片均来自互联网收集而来，版权归原创者所有。本网站只提供web页面服务，并不提供资源存储，也不参与录制、上传。',
  },
  {
    question: '遇到问题如何反馈？',
    answer: 'FeedbackSection',
  },
  {
    question: '版权声明',
    answer: 'CopyrightSection',
  },
];

// 版权声明组件
function CopyrightSection() {
  const { copyrightEmail, contactEmail } = useSite();

  return (
    <div className="space-y-3">
      <p className="text-gray-700 dark:text-gray-300">
        本站所有视频资源均采集自互联网。如果无意中侵犯了您的版权，请立即通过邮件联系我们，我们将在核实后第一时间进行处理。
      </p>
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          版权投诉联系邮箱：
        </p>
        <p className="text-base font-mono text-green-600 dark:text-green-400">
          {copyrightEmail || contactEmail || ''}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          请在邮件中详细说明侵权内容及您的版权证明材料
        </p>
      </div>
    </div>
  );
}

// 求片功能组件
function RequestMovieSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-gray-700 dark:text-gray-300">
        如果您在本站找不到想看的影片，可以通过以下方式：
      </p>
      <ul className="list-disc list-inside ml-2 space-y-1 text-gray-600 dark:text-gray-400">
        <li>尝试使用不同的关键词进行搜索</li>
        <li>在电影、电视剧等分类页面浏览查找</li>
        <li>等待我们更新视频源，新内容会不断添加</li>
        <li>使用留言求片功能告诉我们您想看的内容</li>
      </ul>

      <button
        onClick={() => setShowModal(true)}
        className="mt-4 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        <Send className="w-4 h-4" />
        留言求片
      </button>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="留言求片"
        placeholder="请输入您想看的影片名称和相关信息..."
        type={2}
      />
    </div>
  );
}

// 反馈功能组件
function FeedbackSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-gray-700 dark:text-gray-300">
        如果您遇到任何问题或有改进建议，我们非常欢迎您的反馈：
      </p>
      <ul className="list-disc list-inside ml-2 space-y-1 text-gray-600 dark:text-gray-400">
        <li>功能建议和改进意见</li>
        <li>使用过程中遇到的问题</li>
        <li>视频源相关的反馈</li>
        <li>其他任何想对我们说的话</li>
      </ul>

      <div className="flex gap-3">
        <button
          onClick={() => setShowModal(true)}
          className="mt-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          提交反馈建议
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
        您也可以通过页面底部的联系方式或相关社交平台群组与我们联系
      </p>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="提交反馈建议"
        placeholder="请描述您的问题或建议..."
        type={1}
      />
    </div>
  );
}

function FAQAccordion({
  item,
  index,
  isOpen,
  onToggle
}: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // 渲染答案内容
  const renderAnswer = () => {
    if (item.answer === 'RequestMovieSection') {
      return <RequestMovieSection />;
    }
    if (item.answer === 'FeedbackSection') {
      return <FeedbackSection />;
    }
    if (item.answer === 'CopyrightSection') {
      return <CopyrightSection />;
    }
    return item.answer;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-xs sm:text-sm font-semibold">
            {index + 1}
          </span>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
            {item.question}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed pl-9">
            {renderAnswer()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { siteName, contactEmail, contactTwitter, contactQQ, contactTelegram, copyrightEmail } = useSite();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <PageLayout activePath="/faq">
      <div className="px-4 sm:px-10 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              常见问题
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              帮助您更好地使用 {siteName}
            </p>
          </div>

          {/* FAQ 列表 */}
          <div className="space-y-3 sm:space-y-4">
            {faqData.map((item, index) => (
              <FAQAccordion
                key={index}
                item={item}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>

          {/* 底部提示 */}
          <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
              还有其他问题？
            </h3>
            <p className="text-sm sm:text-base text-green-700 dark:text-green-400 mb-3">
              如果以上内容没有解答您的疑问，或有商务合作意向，欢迎通过以下方式联系我们。
            </p>
            <div className="space-y-1 mb-3">
              <p className="text-sm sm:text-base text-green-700 dark:text-green-400">
                Email: <span className="font-mono text-green-600 dark:text-green-400">{contactEmail || ''}</span>
              </p>
              <p className="text-sm sm:text-base text-green-700 dark:text-green-400">
                Twitter: <span className="font-mono text-green-600 dark:text-green-400">{contactTwitter || ''}</span>
              </p>
              <p className="text-sm sm:text-base text-green-700 dark:text-green-400">
                QQ: <span className="font-mono text-green-600 dark:text-green-400">{contactQQ || ''}</span>
              </p>
              <p className="text-sm sm:text-base text-green-700 dark:text-green-400">
                Telegram: <span className="font-mono text-green-600 dark:text-green-400">{contactTelegram || ''}</span>
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center text-sm sm:text-base text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors duration-200"
            >
              返回首页 →
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
