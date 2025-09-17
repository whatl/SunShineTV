/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { AuthInfo, getAuthInfoFromCookie } from '@/lib/auth';

// 辅助函数：将所有验证逻辑封装起来，返回用户是否通过身份验证（By AI）
async function isAuthenticated(authInfo: AuthInfo | null): Promise<boolean> {
  if (!authInfo) {
    return false; // 没有认证信息，未登录
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  // localstorage 模式验证
  if (storageType === 'localstorage') {
    if (authInfo.password && authInfo.password === process.env.PASSWORD) {
      return true;
    }
    return false;
  }

  // 其他模式：验证签名
  if (authInfo.username && authInfo.signature) {
    const isValid = await verifySignature(
      authInfo.username,
      authInfo.signature,
      process.env.PASSWORD || ''
    );
    return isValid;
  }

  return false;
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 跳过不需要认证的静态资源路径
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  // 2. 如果未设置密码，强制跳转到警告页
  if (!process.env.PASSWORD) {
    const warningUrl = new URL('/warning', request.url);
    return NextResponse.redirect(warningUrl);
  }

  // 3. 获取并验证用户身份
  const authInfo = getAuthInfoFromCookie(request);
  const userIsAuthenticated = await isAuthenticated(authInfo);

  // 4. 如果用户已通过身份验证，允许访问
  if (userIsAuthenticated) {
    return NextResponse.next();
  }

  // 5. 如果用户未通过身份验证（无Cookie或Cookie无效）
  //    - 如果是受保护的API路由，则拒绝访问
  //    - 如果是普通页面，则允许匿名访问
  if (pathname.startsWith('/api')) {
    // 这里的API路由已经被matcher排除了公共部分，因此都是需要保护的
    return handleAuthFailure(request, pathname);
  }

  // 对于所有其他页面，允许匿名访问
  return NextResponse.next();
}

// 验证签名
async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  try {
    // 导入密钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // 将十六进制字符串转换为Uint8Array
    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    // 验证签名
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      messageData
    );
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

// 处理认证失败的情况
function handleAuthFailure(
  request: NextRequest,
  pathname: string
): NextResponse {
  // 如果是 API 路由，返回 401 状态码
  if (pathname.startsWith('/api')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 否则重定向到登录页面
  const loginUrl = new URL('/login', request.url);
  // 保留完整的URL，包括查询参数
  const fullUrl = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', fullUrl);
  return NextResponse.redirect(loginUrl);
}

// 判断是否需要跳过认证的路径
function shouldSkipAuth(pathname: string): boolean {
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/icons/',
    '/logo.png',
    '/version/CHANGELOG',
    // API白名单
    '/api/search',
    '/api/detail',
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

// 配置middleware匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|warning|api/login|api/register|api/logout|api/cron|api/server-config).*)',
  ],
};