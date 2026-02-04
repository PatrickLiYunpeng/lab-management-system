import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, LoginResponse } from '../types';
import api from '../services/api';
import { modulePermissionService, type ModuleDefinition } from '../services/modulePermissionService';
import { setUserAccessibleModules, clearUserModulePermissions, type ModuleCode } from '../utils/permissions';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessibleModules: ModuleDefinition[];
  modulesLoaded: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  clearError: () => void;
  loadUserModules: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      accessibleModules: [],
      modulesLoaded: false,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<LoginResponse>('/auth/login', credentials);
          const { access_token, user } = response.data;
          
          localStorage.setItem('access_token', access_token);
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // 登录成功后加载用户模块权限
          get().loadUserModules();
          
          return response.data;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        clearUserModulePermissions();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          accessibleModules: [],
          modulesLoaded: false,
        });
      },

      clearError: () => set({ error: null }),

      loadUserModules: async () => {
        try {
          const response = await modulePermissionService.getMyModules();
          const modules = response.accessible_modules;
          set({ 
            accessibleModules: modules,
            modulesLoaded: true,
          });
          // 同步到 permissions 工具函数
          setUserAccessibleModules(modules.map(m => m.code as ModuleCode));
        } catch (error) {
          console.error('Failed to load user modules:', error);
          set({ modulesLoaded: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        accessibleModules: state.accessibleModules,
        modulesLoaded: state.modulesLoaded,
      }),
    }
  )
);
