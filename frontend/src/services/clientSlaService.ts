import api from './api';
import type {
  ClientSLA,
  ClientSLAFormData,
  ClientSLAUpdateData,
  ClientSLAFilters,
  TestingSourceCategory,
  TestingSourceCategoryFormData,
  TestingSourceCategoryUpdateData,
  TestingSourceCategoryFilters,
  PaginatedResponse,
} from '../types';

interface GetClientSLAsParams extends ClientSLAFilters {
  page?: number;
  page_size?: number;
}

interface GetSourceCategoriesParams extends TestingSourceCategoryFilters {
  page?: number;
  page_size?: number;
}

export const clientSlaService = {
  // Client SLA methods
  async getClientSLAs(params: GetClientSLAsParams = {}): Promise<PaginatedResponse<ClientSLA>> {
    const response = await api.get<PaginatedResponse<ClientSLA>>('/clients/slas', { params });
    return response.data;
  },

  async getClientSLAById(id: number): Promise<ClientSLA> {
    const response = await api.get<ClientSLA>(`/clients/slas/${id}`);
    return response.data;
  },

  async createClientSLA(data: ClientSLAFormData): Promise<ClientSLA> {
    const response = await api.post<ClientSLA>('/clients/slas', data);
    return response.data;
  },

  async updateClientSLA(id: number, data: ClientSLAUpdateData): Promise<ClientSLA> {
    const response = await api.put<ClientSLA>(`/clients/slas/${id}`, data);
    return response.data;
  },

  async deleteClientSLA(id: number): Promise<void> {
    await api.delete(`/clients/slas/${id}`);
  },

  // Testing Source Category methods
  async getSourceCategories(params: GetSourceCategoriesParams = {}): Promise<PaginatedResponse<TestingSourceCategory>> {
    const response = await api.get<PaginatedResponse<TestingSourceCategory>>('/clients/source-categories', { params });
    return response.data;
  },

  async getAllSourceCategories(): Promise<TestingSourceCategory[]> {
    const response = await api.get<TestingSourceCategory[]>('/clients/source-categories/all');
    return response.data;
  },

  async getSourceCategoryById(id: number): Promise<TestingSourceCategory> {
    const response = await api.get<TestingSourceCategory>(`/clients/source-categories/${id}`);
    return response.data;
  },

  async createSourceCategory(data: TestingSourceCategoryFormData): Promise<TestingSourceCategory> {
    const response = await api.post<TestingSourceCategory>('/clients/source-categories', data);
    return response.data;
  },

  async updateSourceCategory(id: number, data: TestingSourceCategoryUpdateData): Promise<TestingSourceCategory> {
    const response = await api.put<TestingSourceCategory>(`/clients/source-categories/${id}`, data);
    return response.data;
  },

  async deleteSourceCategory(id: number): Promise<void> {
    await api.delete(`/clients/source-categories/${id}`);
  },
};
