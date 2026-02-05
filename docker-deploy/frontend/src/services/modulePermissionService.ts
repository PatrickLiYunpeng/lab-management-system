import api from './api';

// 模块定义
export interface ModuleDefinition {
  code: string;
  label: string;
  route: string;
  icon?: string;
  category: string;
  description?: string;
  display_order: number;
}

// 单个角色的模块权限
export interface RoleModulePermission {
  module_code: string;
  module_label: string;
  category: string;
  can_access: boolean;
}

// 角色的所有模块权限
export interface RoleModulePermissions {
  role: string;
  role_label: string;
  modules: RoleModulePermission[];
}

// 完整模块权限矩阵
export interface ModuleMatrix {
  roles: RoleModulePermissions[];
}

// 批量更新单项
export interface BulkModulePermissionUpdateItem {
  role: string;
  module_code: string;
  can_access: boolean;
}

// 批量更新请求
export interface BulkModulePermissionUpdate {
  updates: BulkModulePermissionUpdateItem[];
  reason?: string;
}

// 用户有效模块权限响应
export interface UserEffectiveModules {
  user_id: number;
  username: string;
  role: string;
  role_label: string;
  accessible_modules: ModuleDefinition[];
}

export const modulePermissionService = {
  /**
   * 获取所有模块定义
   */
  async getModuleDefinitions(): Promise<ModuleDefinition[]> {
    const response = await api.get('/permissions/modules');
    return response.data;
  },

  /**
   * 获取完整模块权限矩阵
   */
  async getModuleMatrix(): Promise<ModuleMatrix> {
    const response = await api.get('/permissions/module-matrix');
    return response.data;
  },

  /**
   * 更新单个模块权限
   */
  async updateModulePermission(
    role: string,
    moduleCode: string,
    canAccess: boolean,
    reason?: string
  ): Promise<{
    message: string;
    role: string;
    role_label: string;
    module_code: string;
    module_label: string;
    can_access: boolean;
  }> {
    const response = await api.put(`/permissions/module/${role}/${moduleCode}`, {
      can_access: canAccess,
      reason,
    });
    return response.data;
  },

  /**
   * 批量更新模块权限
   */
  async bulkUpdateModulePermissions(
    data: BulkModulePermissionUpdate
  ): Promise<{ message: string; updated_count: number }> {
    const response = await api.post('/permissions/module-bulk-update', data);
    return response.data;
  },

  /**
   * 重置模块权限为默认值
   */
  async resetModulePermissionsToDefaults(
    role?: string
  ): Promise<{ message: string; reset_count: number; roles_affected: string[] }> {
    const response = await api.post('/permissions/module-reset-defaults', null, {
      params: role ? { role } : undefined,
    });
    return response.data;
  },

  /**
   * 获取指定用户的有效模块权限
   */
  async getUserEffectiveModules(userId: number): Promise<UserEffectiveModules> {
    const response = await api.get(`/permissions/user/${userId}/effective-modules`);
    return response.data;
  },

  /**
   * 获取当前用户的有效模块权限
   */
  async getMyModules(): Promise<UserEffectiveModules> {
    const response = await api.get('/permissions/my-modules');
    return response.data;
  },
};
