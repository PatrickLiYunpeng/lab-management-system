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
