import api from './api';

export interface AuditLog {
  id: number;
  user_id?: number;
  username?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  laboratory_id?: number;
  site_id?: number;
  ip_address?: string;
  request_method?: string;
  request_path?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  description?: string;
  extra_data?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilters {
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: number;
  laboratory_id?: number;
  site_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  signal?: AbortSignal;
}

export const auditLogService = {
  async getAuditLogs(
    params: AuditLogFilters & { page?: number; page_size?: number } = {}
  ): Promise<AuditLogListResponse> {
    const { signal, ...queryParams } = params;
    const response = await api.get<AuditLogListResponse>('/audit-logs', { params: queryParams, signal });
    return response.data;
  },

  async getAuditLogById(id: number): Promise<AuditLog> {
    const response = await api.get<AuditLog>(`/audit-logs/${id}`);
    return response.data;
  },

  async getEntityAuditLogs(entityType: string, entityId: number, limit?: number): Promise<AuditLog[]> {
    const params = limit ? { limit } : {};
    const response = await api.get<AuditLog[]>(`/audit-logs/entity/${entityType}/${entityId}`, { params });
    return response.data;
  },

  async getAuditActions(): Promise<string[]> {
    const response = await api.get<string[]>('/audit-logs/actions');
    return response.data;
  },

  async getEntityTypes(): Promise<string[]> {
    const response = await api.get<string[]>('/audit-logs/entity-types');
    return response.data;
  },
};
