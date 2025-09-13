'use client';

import { createContext, ReactNode,useContext } from 'react';

// 定义认证信息的类型 (By AI)
// 来自服务端提供的授权数据，比本地Cookie更安全
interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

// 创建 AuthContext，初始值为 null
export const AuthContext = createContext<AuthInfo | null>(null);

// 创建一个自定义 Hook，方便子组件使用
export const useAuth = () => {
  return useContext(AuthContext);
};

// 创建 Provider 组件
interface AuthProviderProps {
  children: ReactNode;
  value: AuthInfo | null;
}

export const AuthProvider = ({ children, value }: AuthProviderProps) => {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
