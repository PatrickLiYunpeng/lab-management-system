/**
 * 人员服务 - Personnel Service
 * 
 * 本模块提供人员管理相关的API调用封装。
 * 
 * 功能:
 * - 人员CRUD：获取列表、详情、创建、更新、删除
 * - 支持分页和多条件筛选
 * - 支持请求取消（AbortSignal）
 * 
 * 方法:
 * - getPersonnel(): 获取人员列表
 * - getPersonnelById(): 获取人员详情
 * - createPersonnel(): 创建新人员
 * - updatePersonnel(): 更新人员信息
 * - deletePersonnel(): 删除人员
 */
import api from './api';
import type {
  Personnel,
  PersonnelFormData,
  PersonnelUpdateData,
  PersonnelFilters,
  PaginatedResponse,
} from '../types';

interface GetPersonnelParams extends PersonnelFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export const personnelService = {
  async getPersonnel(params: GetPersonnelParams = {}): Promise<PaginatedResponse<Personnel>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<Personnel>>('/personnel', { params: queryParams, signal });
    return response.data;
  },

  async getPersonnelById(id: number): Promise<Personnel> {
    const response = await api.get<Personnel>(`/personnel/${id}`);
    return response.data;
  },

  async createPersonnel(data: PersonnelFormData): Promise<Personnel> {
    const response = await api.post<Personnel>('/personnel', data);
    return response.data;
  },

  async updatePersonnel(id: number, data: PersonnelUpdateData): Promise<Personnel> {
    const response = await api.put<Personnel>(`/personnel/${id}`, data);
    return response.data;
  },

  async deletePersonnel(id: number): Promise<void> {
    await api.delete(`/personnel/${id}`);
  },
};
