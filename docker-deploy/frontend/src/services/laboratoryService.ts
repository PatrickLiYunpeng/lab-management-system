import api from './api';
import type { Laboratory, LaboratoryFormData, LaboratoryFilters, PaginatedResponse } from '../types';

interface GetLaboratoriesParams extends LaboratoryFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export const laboratoryService = {
  async getLaboratories(params: GetLaboratoriesParams = {}): Promise<PaginatedResponse<Laboratory>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<Laboratory>>('/laboratories', { params: queryParams, signal });
    return response.data;
  },

  async getLaboratory(id: number): Promise<Laboratory> {
    const response = await api.get<Laboratory>(`/laboratories/${id}`);
    return response.data;
  },

  async createLaboratory(data: LaboratoryFormData): Promise<Laboratory> {
    const response = await api.post<Laboratory>('/laboratories', data);
    return response.data;
  },

  async updateLaboratory(id: number, data: Partial<LaboratoryFormData>): Promise<Laboratory> {
    const response = await api.put<Laboratory>(`/laboratories/${id}`, data);
    return response.data;
  },

  async deleteLaboratory(id: number): Promise<void> {
    await api.delete(`/laboratories/${id}`);
  },
};
