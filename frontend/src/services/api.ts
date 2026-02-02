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
// Set to true to enable automatic logout on 401 responses
// Currently DISABLED - set to true to re-enable
const ENABLE_401_AUTO_LOGOUT = false;

// Flag to prevent multiple 401 handlers from executing
let isRedirectingToLogin = false;

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401 auto-logout is temporarily disabled
    // To re-enable: set ENABLE_401_AUTO_LOGOUT = true above
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
