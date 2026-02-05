/**
 * 工单服务 - Work Order Service
 * 
 * 本模块提供工单相关的API调用封装，是前端与后端工单接口的桥梁。
 * 
 * 功能:
 * - 工单CRUD操作：获取列表、详情、创建、更新
 * - 工单分配：指派工程师
 * - 任务管理：创建任务、分配技术员、更新状态
 * - 物料消耗：记录任务物料消耗
 * - 数据导出：导出CSV格式
 * 
 * 方法:
 * - getWorkOrders(): 获取工单列表（分页、筛选）
 * - getWorkOrderById(): 获取单个工单详情
 * - createWorkOrder(): 创建新工单
 * - updateWorkOrder(): 更新工单信息
 * - assignWorkOrder(): 指派主管工程师
 * - createTask(): 创建工单任务
 * - assignTask(): 分配任务给技术员
 * - updateTaskStatus(): 更新任务状态
 * - recordConsumption(): 记录物料消耗
 */
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
  Consumption,
  ConsumptionBatchCreate,
  ConsumptionVoid,
  ConsumptionStatus,
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

  // 获取可选的样品列表（排除已返还、遗失、已处置状态）
  async getAvailableMaterials(params: { search?: string; site_id?: number; client_id?: number; product_id?: number; page?: number; page_size?: number } = {}): Promise<{
    items: Array<{
      id: number;
      material_code: string;
      name: string;
      status: string;
      material_type: string;
      storage_location: string;
      quantity: number;
      unit: string;
      client_id: number | null;
      product_id: number | null;
    }>;
    total: number;
    page: number;
    page_size: number;
  }> {
    const response = await api.get('/work-orders/available-materials/list', { params });
    return response.data;
  },

  // ========== Material Consumption endpoints (材料消耗) ==========

  /**
   * 批量创建任务材料消耗记录
   * 仅支持非样品类型材料
   */
  async createConsumptions(
    workOrderId: number,
    taskId: number,
    data: ConsumptionBatchCreate
  ): Promise<Consumption[]> {
    const response = await api.post<Consumption[]>(
      `/work-orders/${workOrderId}/tasks/${taskId}/consumptions`,
      data
    );
    return response.data;
  },

  /**
   * 查询任务的材料消耗记录列表
   */
  async getConsumptions(
    workOrderId: number,
    taskId: number,
    params: { page?: number; page_size?: number; status?: ConsumptionStatus } = {}
  ): Promise<PaginatedResponse<Consumption>> {
    const response = await api.get<PaginatedResponse<Consumption>>(
      `/work-orders/${workOrderId}/tasks/${taskId}/consumptions`,
      { params }
    );
    return response.data;
  },

  /**
   * 作废材料消耗记录
   * 自动创建补充记录恢复库存
   */
  async voidConsumption(consumptionId: number, data: ConsumptionVoid): Promise<Consumption> {
    const response = await api.post<Consumption>(`/consumptions/${consumptionId}/void`, data);
    return response.data;
  },
};
