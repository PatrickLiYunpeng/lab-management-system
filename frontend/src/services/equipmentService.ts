import api from './api';
import type {
  Equipment,
  EquipmentFormData,
  EquipmentUpdateData,
  EquipmentFilters,
  EquipmentCapacity,
  PaginatedResponse,
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
};
