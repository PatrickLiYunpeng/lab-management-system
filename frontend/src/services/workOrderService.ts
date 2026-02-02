import api from './api';
import type {
  WorkOrder,
  WorkOrderFormData,
  WorkOrderUpdateData,
  WorkOrderFilters,
  WorkOrderTask,
  TaskFormData,
  TaskUpdateData,
  EligibleTechniciansResponse,
  PaginatedResponse,
} from '../types';

interface GetWorkOrdersParams extends WorkOrderFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export const workOrderService = {
  async getWorkOrders(params: GetWorkOrdersParams = {}): Promise<PaginatedResponse<WorkOrder>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<WorkOrder>>('/work-orders', { params: queryParams, signal });
    return response.data;
  },

  async getWorkOrderById(id: number): Promise<WorkOrder> {
    const response = await api.get<WorkOrder>(`/work-orders/${id}`);
    return response.data;
  },

  async createWorkOrder(data: WorkOrderFormData): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>('/work-orders', data);
    return response.data;
  },

  async updateWorkOrder(id: number, data: WorkOrderUpdateData): Promise<WorkOrder> {
    const response = await api.put<WorkOrder>(`/work-orders/${id}`, data);
    return response.data;
  },

  async assignWorkOrder(id: number, engineerId: number): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>(`/work-orders/${id}/assign`, { engineer_id: engineerId });
    return response.data;
  },

  async deleteWorkOrder(id: number): Promise<void> {
    await api.delete(`/work-orders/${id}`);
  },

  // Task endpoints
  async getTasks(workOrderId: number): Promise<WorkOrderTask[]> {
    const response = await api.get<WorkOrderTask[]>(`/work-orders/${workOrderId}/tasks`);
    return response.data;
  },

  async createTask(workOrderId: number, data: TaskFormData): Promise<WorkOrderTask> {
    const response = await api.post<WorkOrderTask>(`/work-orders/${workOrderId}/tasks`, data);
    return response.data;
  },

  async updateTask(workOrderId: number, taskId: number, data: TaskUpdateData): Promise<WorkOrderTask> {
    const response = await api.put<WorkOrderTask>(`/work-orders/${workOrderId}/tasks/${taskId}`, data);
    return response.data;
  },

  async deleteTask(workOrderId: number, taskId: number): Promise<void> {
    await api.delete(`/work-orders/${workOrderId}/tasks/${taskId}`);
  },

  async assignTask(workOrderId: number, taskId: number, data: { technician_id: number; equipment_id?: number }): Promise<WorkOrderTask> {
    const response = await api.post<WorkOrderTask>(`/work-orders/${workOrderId}/tasks/${taskId}/assign`, data);
    return response.data;
  },

  async getEligibleTechnicians(
    workOrderId: number,
    taskId: number,
    params: { status?: string; min_match_score?: number } = {}
  ): Promise<EligibleTechniciansResponse> {
    const response = await api.get<EligibleTechniciansResponse>(
      `/work-orders/${workOrderId}/tasks/${taskId}/eligible-technicians`,
      { params }
    );
    return response.data;
  },
};
