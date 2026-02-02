import api from './api';
import type {
  Client,
  ClientFormData,
  ClientUpdateData,
  ClientFilters,
  PaginatedResponse,
} from '../types';

interface GetClientsParams extends ClientFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export const clientService = {
  async getClients(params: GetClientsParams = {}): Promise<PaginatedResponse<Client>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<Client>>('/materials/clients/', { params: queryParams, signal });
    return response.data;
  },

  async getClientById(id: number): Promise<Client> {
    const response = await api.get<Client>(`/materials/clients/${id}`);
    return response.data;
  },

  async createClient(data: ClientFormData): Promise<Client> {
    const response = await api.post<Client>('/materials/clients/', data);
    return response.data;
  },

  async updateClient(id: number, data: ClientUpdateData): Promise<Client> {
    const response = await api.put<Client>(`/materials/clients/${id}`, data);
    return response.data;
  },

  async getAllClients(): Promise<Client[]> {
    const response = await api.get<PaginatedResponse<Client>>('/materials/clients/', {
      params: { page: 1, page_size: 100 },
    });
    return response.data.items;
  },
};
