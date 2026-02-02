import api from './api';
import type { Site, SiteFormData, PaginatedResponse } from '../types';

interface GetSitesParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const siteService = {
  async getSites(params: GetSitesParams = {}): Promise<PaginatedResponse<Site>> {
    const response = await api.get<PaginatedResponse<Site>>('/sites', { params });
    return response.data;
  },

  async getSite(id: number): Promise<Site> {
    const response = await api.get<Site>(`/sites/${id}`);
    return response.data;
  },

  async createSite(data: SiteFormData): Promise<Site> {
    const response = await api.post<Site>('/sites', data);
    return response.data;
  },

  async updateSite(id: number, data: Partial<SiteFormData>): Promise<Site> {
    const response = await api.put<Site>(`/sites/${id}`, data);
    return response.data;
  },

  async deleteSite(id: number): Promise<void> {
    await api.delete(`/sites/${id}`);
  },

  async getAllSites(): Promise<Site[]> {
    const response = await api.get<PaginatedResponse<Site>>('/sites', {
      params: { page: 1, page_size: 100 },
    });
    return response.data.items;
  },
};
