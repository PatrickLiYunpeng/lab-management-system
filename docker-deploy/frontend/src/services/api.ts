/**
 * API客户端配置 - API Client Configuration
 * 
 * 本模块配置Axios HTTP客户端实例，提供统一的API请求处理。
 * 
 * 功能:
 * - 配置基础URL和默认请求头
 * - 请求拦截器：自动添加JWT认证令牌
 * - 响应拦截器：处理401认证错误，自动跳转登录
 * - 请求取消错误检测
 * 
 * 导出:
 * - api: Axios实例，用于发送API请求
 * - isAbortError(): 检测请求取消错误的工具函数
 */
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 检测错误是否为请求取消错误
 * 用于在组件卸载时忽略已取消的请求错误
 */
export function isAbortError(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'CanceledError') return true;
  return false;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// === 401 Auto-Logout Configuration ===
const ENABLE_401_AUTO_LOGOUT = true;

// Flag to prevent multiple 401 handlers from executing
let isRedirectingToLogin = false;

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (ENABLE_401_AUTO_LOGOUT && error.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      // Clear all auth state - both the token and Zustand persisted state
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
