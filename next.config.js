/** @type {import('next').NextConfig} */
/* eslint-disable @typescript-eslint/no-var-requires */

// 使用webpackObFuscator进行混淆
// const WebpackObfuscator = require('webpack-obfuscator');
// const obfuscationConfig = require('./obfuscation.config.js');

const nextConfig = {
  output: 'standalone',
  eslint: {
    dirs: ['src'],
  },

  // ============================================
  // 优化1: 启用 React 严格模式（仅开发环境）
  // ============================================
  // 作用：帮助发现潜在问题（副作用、废弃 API 等）
  // 注意：仅在开发时运行额外检查，不影响生产性能
  reactStrictMode: process.env.NODE_ENV === 'development',

  // Next.js 15 默认启用 SWC 压缩，无需手动配置
  swcMinify: true,

  experimental: {
    // Next.js 15 默认支持 instrumentation.js，无需手动启用
    // instrumentationHook: process.env.NODE_ENV === 'production',
    // ============================================
    // 优化3: 启用路由缓存（解决性能问题）
    // ============================================
    // 作用：缓存客户端路由，减少重新渲染
    // dynamic: 动态路由缓存时间（秒）
    // static: 静态路由缓存时间（秒）
    staleTimes: {
      dynamic: 30,  // 动态页面缓存 30 秒
      static: 180,  // 静态页面缓存 180 秒
    },
  },

  // Turbopack 配置 (Next.js 15+)
  turbopack: {
    rules: {
      // SVG 处理规则
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // 自定义 HTTP 响应头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // 允许浏览器缓存但需要重新验证（支持 bfcache）
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          // 安全相关头部
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },

  // Uncoment to add domain whitelist
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // 使用WebpackObfuscator混淆，但是他只混淆后端不对前端混淆所以不使用这套方案，使用swcMinify混淆够用 （By Faker）
  // webpack(config, { dev, isServer }) {
  //   // 只在生产环境启用混淆
  //   if (!dev && process.env.NODE_ENV === 'production') {
  //     // 服务端代码混淆配置
  //     if (isServer) {
  //       console.log(`代码混淆执行`)
  //       config.plugins.push(
  //         new WebpackObfuscator(obfuscationConfig.obfuscator)
  //       );
  //     }
  //   }

  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: { not: /\.(css|scss|sass)$/ },
        resourceQuery: { not: /url/ }, // exclude if *.svg?url
        loader: '@svgr/webpack',
        options: {
          dimensions: false,
          titleProp: true,
        },
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
};

// ============================================
// ============================================
// PWA 配置优化（支持 bfcache）
// ============================================
// skipWaiting: false 的权衡：
// ✅ 优势：
//    - 完全支持 bfcache（返回速度提升 10 倍）
//    - 避免版本冲突（旧页面加载新资源）
//    - 用户体验更流畅
// ⚠️  劣势：
//    - SW 更新需要用户关闭所有标签页后才生效
//    - 但对于视频网站，用户频繁返回 >> 偶尔更新，值得！
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: false,  // 推荐：优先 bfcache
});

module.exports = withPWA(nextConfig);
