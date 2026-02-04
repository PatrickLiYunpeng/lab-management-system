import api from './api';
import type {
  Equipment,
  EquipmentFormData,
  EquipmentUpdateData,
  EquipmentFilters,
  EquipmentCapacity,
  PaginatedResponse,
  EquipmentCategoryRecord,
  EquipmentCategoryWithNames,
  EquipmentCategoryFormData,
  EquipmentCategoryUpdateData,
  EquipmentNameRecord,
  EquipmentNameWithCategory,
  EquipmentNameFormData,
  EquipmentNameUpdateData,
} from '../types';

interface GetEquipmentParams extends EquipmentFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export interface EquipmentSchedule {
  id: number;
  start_time: string;
  end_time: string;
  title?: string;
  status: string;
  work_order_id?: number;
  task_id?: number;
  operator_name?: string;
  priority_level?: number;  // 优先级等级（1-5，1=最高）
}

export interface EquipmentGanttItem {
  id: number;
  name: string;
  code: string;
  equipment_type: string;
  status: string;
  laboratory_id: number;
  schedules: EquipmentSchedule[];
}

export interface GanttData {
  start_date: string;
  end_date: string;
  equipment: EquipmentGanttItem[];
  total_equipment: number;
  total_schedules: number;
}

export interface ScheduleCreateData {
  start_time: string;
  end_time: string;
  work_order_id?: number;
  task_id?: number;
  operator_id?: number;
  title?: string;
  notes?: string;
}

// 设备名下设备列表响应（用于关键设备调度）
export interface EquipmentByNameResponse {
  equipment_name_id: number;
  equipment_name: string;
  is_critical: boolean;
  site_id: number;
  items: Equipment[];
  total: number;
}

export const equipmentService = {
  async getEquipment(params: GetEquipmentParams = {}): Promise<PaginatedResponse<Equipment>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<Equipment>>('/equipment', { params: queryParams, signal });
    return response.data;
  },

  async getEquipmentById(id: number): Promise<Equipment> {
    const response = await api.get<Equipment>(`/equipment/${id}`);
    return response.data;
  },

  async createEquipment(data: EquipmentFormData): Promise<Equipment> {
    const response = await api.post<Equipment>('/equipment', data);
    return response.data;
  },

  async updateEquipment(id: number, data: EquipmentUpdateData): Promise<Equipment> {
    const response = await api.put<Equipment>(`/equipment/${id}`, data);
    return response.data;
  },

  async deleteEquipment(id: number): Promise<void> {
    await api.delete(`/equipment/${id}`);
  },

  // Scheduling methods
  async getGanttData(params: {
    start_date: string;
    end_date: string;
    laboratory_id?: number;
    site_id?: number;
    equipment_type?: string;
    category?: string;
    equipment_ids?: number[];  // 指定设备ID列表（用于关键设备调度）
  }): Promise<GanttData> {
    const response = await api.get<GanttData>('/equipment/schedules/gantt', { params });
    return response.data;
  },

  async getEquipmentSchedules(
    equipmentId: number,
    startDate?: string,
    endDate?: string
  ): Promise<EquipmentSchedule[]> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get<EquipmentSchedule[]>(`/equipment/${equipmentId}/schedules`, { params });
    return response.data;
  },

  async createSchedule(equipmentId: number, data: ScheduleCreateData): Promise<EquipmentSchedule> {
    const response = await api.post<EquipmentSchedule>(`/equipment/${equipmentId}/schedules`, data);
    return response.data;
  },

  async deleteSchedule(equipmentId: number, scheduleId: number): Promise<void> {
    await api.delete(`/equipment/${equipmentId}/schedules/${scheduleId}`);
  },

  async getEquipmentCapacity(equipmentId: number): Promise<EquipmentCapacity> {
    const response = await api.get<EquipmentCapacity>(`/work-orders/equipment/${equipmentId}/capacity`);
    return response.data;
  },

  // ============================================================================
  // Equipment Category Management (设备类别管理)
  // ============================================================================

  async getEquipmentCategories(isActive?: boolean): Promise<EquipmentCategoryRecord[]> {
    const params: Record<string, unknown> = {};
    if (isActive !== undefined) params.is_active = isActive;
    const response = await api.get<EquipmentCategoryRecord[]>('/equipment-categories', { params });
    return response.data;
  },

  async getEquipmentCategoryById(id: number): Promise<EquipmentCategoryWithNames> {
    const response = await api.get<EquipmentCategoryWithNames>(`/equipment-categories/${id}`);
    return response.data;
  },

  async createEquipmentCategory(data: EquipmentCategoryFormData): Promise<EquipmentCategoryRecord> {
    const response = await api.post<EquipmentCategoryRecord>('/equipment-categories', data);
    return response.data;
  },

  async updateEquipmentCategory(id: number, data: EquipmentCategoryUpdateData): Promise<EquipmentCategoryRecord> {
    const response = await api.put<EquipmentCategoryRecord>(`/equipment-categories/${id}`, data);
    return response.data;
  },

  async deleteEquipmentCategory(id: number): Promise<void> {
    await api.delete(`/equipment-categories/${id}`);
  },

  // ============================================================================
  // Equipment Name Management (设备名管理)
  // ============================================================================

  async getEquipmentNames(params?: {
    category_id?: number;
    is_active?: boolean;
    search?: string;
  }): Promise<EquipmentNameWithCategory[]> {
    const response = await api.get<EquipmentNameWithCategory[]>('/equipment-names', { params });
    return response.data;
  },

  async getEquipmentNamesByCategory(categoryId: number): Promise<EquipmentNameRecord[]> {
    const response = await api.get<EquipmentNameRecord[]>(`/equipment-categories/${categoryId}/names`);
    return response.data;
  },

  async getEquipmentNameById(id: number): Promise<EquipmentNameWithCategory> {
    const response = await api.get<EquipmentNameWithCategory>(`/equipment-names/${id}`);
    return response.data;
  },

  // 获取指定设备名在指定站点下的所有设备实例（用于关键设备调度）
  async getEquipmentByName(nameId: number, siteId: number, isActive: boolean = true): Promise<EquipmentByNameResponse> {
    const response = await api.get<EquipmentByNameResponse>(`/equipment-names/${nameId}/equipment`, {
      params: { site_id: siteId, is_active: isActive }
    });
    return response.data;
  },

  async createEquipmentName(data: EquipmentNameFormData): Promise<EquipmentNameRecord> {
    const response = await api.post<EquipmentNameRecord>('/equipment-names', data);
    return response.data;
  },

  async updateEquipmentName(id: number, data: EquipmentNameUpdateData): Promise<EquipmentNameRecord> {
    const response = await api.put<EquipmentNameRecord>(`/equipment-names/${id}`, data);
    return response.data;
  },

  async deleteEquipmentName(id: number): Promise<void> {
    await api.delete(`/equipment-names/${id}`);
  },
};
