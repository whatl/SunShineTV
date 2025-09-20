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

  reactStrictMode: false,
  swcMinify: true, // Enabled SWC for minification （By AI）

  experimental: {
    instrumentationHook: process.env.NODE_ENV === 'production',
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

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);
