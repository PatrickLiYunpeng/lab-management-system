import api from './api';
import type {
  Material,
  MaterialFormData,
  MaterialUpdateData,
  MaterialFilters,
  Client,
  PaginatedResponse,
  Replenishment,
  ReplenishmentFormData,
} from '../types';

interface GetMaterialsParams extends MaterialFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

interface GetClientsParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}

export const materialService = {
  async getMaterials(params: GetMaterialsParams = {}): Promise<PaginatedResponse<Material>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<Material>>('/materials', { params: queryParams, signal });
    return response.data;
  },

  async getMaterialById(id: number): Promise<Material> {
    const response = await api.get<Material>(`/materials/${id}`);
    return response.data;
  },

  async createMaterial(data: MaterialFormData): Promise<Material> {
    const response = await api.post<Material>('/materials', data);
    return response.data;
  },

  async updateMaterial(id: number, data: MaterialUpdateData): Promise<Material> {
    const response = await api.put<Material>(`/materials/${id}`, data);
    return response.data;
  },

  async disposeMaterial(id: number, data: { disposal_method: string; disposal_notes?: string }): Promise<Material> {
    const response = await api.post<Material>(`/materials/${id}/dispose`, data);
    return response.data;
  },

  async returnMaterial(id: number, data: { return_tracking_number?: string; return_notes?: string }): Promise<Material> {
    const response = await api.post<Material>(`/materials/${id}/return`, data);
    return response.data;
  },

  // Replenishment endpoints
  async replenishMaterial(id: number, data: ReplenishmentFormData): Promise<Material> {
    const response = await api.post<Material>(`/materials/${id}/replenish`, data);
    return response.data;
  },

  async getReplenishments(
    materialId: number,
    params: { page?: number; page_size?: number } = {}
  ): Promise<PaginatedResponse<Replenishment>> {
    const response = await api.get<PaginatedResponse<Replenishment>>(
      `/materials/${materialId}/replenishments`,
      { params }
    );
    return response.data;
  },

  // Client endpoints
  async getClients(params: GetClientsParams = {}): Promise<PaginatedResponse<Client>> {
    const response = await api.get<PaginatedResponse<Client>>('/materials/clients/', { params });
    return response.data;
  },

  async getAllClients(): Promise<Client[]> {
    const response = await api.get<PaginatedResponse<Client>>('/materials/clients/', {
      params: { page: 1, page_size: 100 },
    });
    return response.data.items;
  },
};
