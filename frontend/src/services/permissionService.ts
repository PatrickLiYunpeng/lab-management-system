import api from './api';

export interface PermissionMatrixItem {
  permission: string;
  permission_label: string;
  is_enabled: boolean;
}

export interface RolePermissions {
  role: string;
  role_label: string;
  permissions: PermissionMatrixItem[];
}

export interface PermissionMatrix {
  roles: RolePermissions[];
}

export interface PermissionDefinition {
  code: string;
  label: string;
  category: string;
  category_label: string;
}

export interface PermissionChangeLog {
  id: number;
  role: string;
  permission: string;
  old_value: boolean | null;
  new_value: boolean;
  changed_by_id: number;
  changed_at: string;
  reason: string | null;
}

export interface BulkPermissionUpdate {
  updates: Array<{
    role: string;
    permission: string;
    is_enabled: boolean;
  }>;
  reason?: string;
}

export const permissionService = {
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const response = await api.get('/permissions/matrix');
    return response.data;
  },

  async getRolePermissions(role: string): Promise<RolePermissions> {
    const response = await api.get(`/permissions/role/${role}`);
    return response.data;
  },

  async getPermissionDefinitions(): Promise<PermissionDefinition[]> {
    const response = await api.get('/permissions/definitions');
    return response.data;
  },

  async updatePermission(
    role: string,
    permission: string,
    isEnabled: boolean,
    reason?: string
  ): Promise<void> {
    await api.put(`/permissions/role/${role}/${permission}`, {
      is_enabled: isEnabled,
      reason,
    });
  },

  async bulkUpdatePermissions(data: BulkPermissionUpdate): Promise<{ updated_count: number }> {
    const response = await api.post('/permissions/bulk-update', data);
    return response.data;
  },

  async getChangeLogs(params?: {
    role?: string;
    permission?: string;
    limit?: number;
  }): Promise<PermissionChangeLog[]> {
    const response = await api.get('/permissions/change-logs', { params });
    return response.data;
  },

  async resetToDefaults(role?: string): Promise<{ reset_count: number }> {
    const response = await api.post('/permissions/reset-to-defaults', null, {
      params: role ? { role } : undefined,
    });
    return response.data;
  },

  async getUserEffectivePermissions(userId: number): Promise<{
    user_id: number;
    username: string;
    role: string;
    role_label: string;
    permissions: string[];
  }> {
    const response = await api.get(`/permissions/user/${userId}/effective`);
    return response.data;
  },
};
