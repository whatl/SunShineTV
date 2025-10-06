/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import he from 'he';
import Hls from 'hls.js';

function getDoubanImageProxyConfig(): {
  proxyType:
  | 'direct'
  | 'server'
  | 'img3'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'custom';
  proxyUrl: string;
} {
  const doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'cmliussss-cdn-tencent';
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
    case 'direct':
    default:
      return originalUrl;
  }
}

// 测评缓存接口
interface VideoTestCache {
  quality: string;
  loadSpeed: string;
  pingTime: number;
  timestamp: number; // 缓存时间戳
}

// 从缓存获取测评结果
function getTestCache(m3u8Url: string): VideoTestCache | null {
  try {
    const cacheKey = `video_test_${btoa(m3u8Url).slice(0, 50)}`; // 使用URL的base64作为key
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: VideoTestCache = JSON.parse(cached);
    const now = Date.now();
    const cacheAge = now - data.timestamp;

    // 缓存2小时有效
    if (cacheAge < 2 * 60 * 60 * 1000) {
      return data;
    } else {
      // 过期缓存删除
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch {
    return null;
  }
}

// 清理所有过期的测评缓存
function cleanExpiredTestCache() {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // 遍历 localStorage 找出所有测评缓存
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('video_test_')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data: VideoTestCache = JSON.parse(cached);
            const cacheAge = now - data.timestamp;

            // 超过2小时的缓存标记为删除
            if (cacheAge >= 2 * 60 * 60 * 1000) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // 解析失败的缓存也删除
          keysToRemove.push(key);
        }
      }
    }

    // 删除过期缓存
    keysToRemove.forEach(key => localStorage.removeItem(key));

    return keysToRemove.length;
  } catch {
    return 0;
  }
}

// 保存测评结果到缓存
function setTestCache(m3u8Url: string, result: { quality: string; loadSpeed: string; pingTime: number }) {
  try {
    const cacheKey = `video_test_${btoa(m3u8Url).slice(0, 50)}`;
    const data: VideoTestCache = {
      ...result,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    // 如果是存储空间不足，清理过期缓存后重试
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      const cleaned = cleanExpiredTestCache();
      console.log(`存储空间不足，已清理 ${cleaned} 条过期缓存`);

      // 重试一次
      try {
        const cacheKey = `video_test_${btoa(m3u8Url).slice(0, 50)}`;
        const data: VideoTestCache = {
          ...result,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // 重试失败也不影响功能
      }
    }
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息（带缓存）
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string; // 如720p、1080p等
  loadSpeed: string; // 自动转换为KB/s或MB/s
  pingTime: number; // 网络延迟（毫秒）
}> {
  // 先检查缓存
  const cached = getTestCache(m3u8Url);
  if (cached) {
    console.log('使用缓存的测评结果:', m3u8Url);
    return {
      quality: cached.quality,
      loadSpeed: cached.loadSpeed,
      pingTime: cached.pingTime
    };
  }

  try {
    // 直接使用m3u8 URL作为视频源，避免CORS问题
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';

      // 测量网络延迟（ping时间） - 使用m3u8 URL而不是ts文件
      const pingStart = performance.now();
      let pingTime = 0;

      // 测量ping时间（使用m3u8 URL）
      fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          pingTime = performance.now() - pingStart;
        })
        .catch(() => {
          pingTime = performance.now() - pingStart; // 记录到失败为止的时间
        });

      // 固定使用hls.js加载
      const hls = new Hls();

      // 设置超时处理
      const timeout = setTimeout(() => {
        hls.destroy();
        video.remove();
        reject(new Error('Timeout loading video metadata'));
      }, 4000);

      video.onerror = () => {
        clearTimeout(timeout);
        hls.destroy();
        video.remove();
        reject(new Error('Failed to load video metadata'));
      };

      let actualLoadSpeed = '未知';
      let hasSpeedCalculated = false;
      let hasMetadataLoaded = false;

      let fragmentStartTime = 0;

      // 检查是否可以返回结果
      const checkAndResolve = () => {
        if (
          hasMetadataLoaded &&
          (hasSpeedCalculated || actualLoadSpeed !== '未知')
        ) {
          clearTimeout(timeout);
          const width = video.videoWidth;
          if (width && width > 0) {
            hls.destroy();
            video.remove();

            // 根据视频宽度判断视频质量等级，使用经典分辨率的宽度作为分割点
            const quality =
              width >= 3840
                ? '4K' // 4K: 3840x2160
                : width >= 2560
                  ? '2K' // 2K: 2560x1440
                  : width >= 1920
                    ? '1080p' // 1080p: 1920x1080
                    : width >= 1280
                      ? '720p' // 720p: 1280x720
                      : width >= 854
                        ? '480p'
                        : 'SD'; // 480p: 854x480

            const result = {
              quality,
              loadSpeed: actualLoadSpeed,
              pingTime: Math.round(pingTime),
            };

            // 保存到缓存
            setTestCache(m3u8Url, result);

            resolve(result);
          } else {
            // webkit 无法获取尺寸，直接返回
            const result = {
              quality: '未知',
              loadSpeed: actualLoadSpeed,
              pingTime: Math.round(pingTime),
            };

            // 保存到缓存
            setTestCache(m3u8Url, result);

            resolve(result);
          }
        }
      };

      // 监听片段加载开始
      hls.on(Hls.Events.FRAG_LOADING, () => {
        fragmentStartTime = performance.now();
      });

      // 监听片段加载完成，只需首个分片即可计算速度
      hls.on(Hls.Events.FRAG_LOADED, (event: any, data: any) => {
        if (
          fragmentStartTime > 0 &&
          data &&
          data.payload &&
          !hasSpeedCalculated
        ) {
          const loadTime = performance.now() - fragmentStartTime;
          const size = data.payload.byteLength || 0;

          if (loadTime > 0 && size > 0) {
            const speedKBps = size / 1024 / (loadTime / 1000);

            // 立即计算速度，无需等待更多分片
            const avgSpeedKBps = speedKBps;

            if (avgSpeedKBps >= 1024) {
              actualLoadSpeed = `${(avgSpeedKBps / 1024).toFixed(1)} MB/s`;
            } else {
              actualLoadSpeed = `${avgSpeedKBps.toFixed(1)} KB/s`;
            }
            hasSpeedCalculated = true;
            checkAndResolve(); // 尝试返回结果
          }
        }
      });

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      // 监听hls.js错误
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        console.error('HLS错误:', data);
        if (data.fatal) {
          clearTimeout(timeout);
          hls.destroy();
          video.remove();
          reject(new Error(`HLS播放失败: ${data.type}`));
        }
      });

      // 监听视频元数据加载完成
      video.onloadedmetadata = () => {
        hasMetadataLoaded = true;
        checkAndResolve(); // 尝试返回结果
      };
    });
  } catch (error) {
    throw new Error(
      `Error getting video resolution: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
