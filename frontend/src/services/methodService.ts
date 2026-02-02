import api from './api';
import type {
  Method,
  MethodFormData,
  MethodUpdateData,
  MethodFilters,
  MethodSkillRequirement,
  MethodSkillRequirementFormData,
  PaginatedResponse,
} from '../types';

export interface MethodListParams extends MethodFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export const methodService = {
  // Methods CRUD
  async getMethods(params?: MethodListParams): Promise<PaginatedResponse<Method>> {
    const { signal, ...queryParams } = params || {};
    const response = await api.get<PaginatedResponse<Method>>('/methods', { params: queryParams, signal });
    return response.data;
  },

  async getMethodById(id: number): Promise<Method> {
    const response = await api.get<Method>(`/methods/${id}`);
    return response.data;
  },

  async createMethod(data: MethodFormData): Promise<Method> {
    const response = await api.post<Method>('/methods', data);
    return response.data;
  },

  async updateMethod(id: number, data: MethodUpdateData): Promise<Method> {
    const response = await api.put<Method>(`/methods/${id}`, data);
    return response.data;
  },

  async deleteMethod(id: number): Promise<void> {
    await api.delete(`/methods/${id}`);
  },

  // Method skill requirements
  async getMethodSkills(methodId: number): Promise<MethodSkillRequirement[]> {
    const response = await api.get<MethodSkillRequirement[]>(`/methods/${methodId}/skills`);
    return response.data;
  },

  async addMethodSkill(methodId: number, data: MethodSkillRequirementFormData): Promise<MethodSkillRequirement> {
    const response = await api.post<MethodSkillRequirement>(`/methods/${methodId}/skills`, data);
    return response.data;
  },

  async removeMethodSkill(methodId: number, skillId: number): Promise<void> {
    await api.delete(`/methods/${methodId}/skills/${skillId}`);
  },
};
