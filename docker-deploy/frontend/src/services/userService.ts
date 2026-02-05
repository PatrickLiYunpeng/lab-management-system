import api from './api';
import type { User, UserRole, PaginatedResponse } from '../types';

export interface UserFormData {
  username: string;
  email: string;
  password?: string;
  full_name?: string;
  role: UserRole;
  primary_laboratory_id?: number;
  primary_site_id?: number;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  primary_laboratory_id?: number;
  primary_site_id?: number;
  is_active?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserDetail extends User {
  primary_laboratory_name?: string;
  primary_site_name?: string;
}

export interface RoleOption {
  value: UserRole;
  label: string;
  label_en: string;
}

export const userService = {
  async getUsers(params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: UserRole;
    is_active?: boolean;
  }): Promise<PaginatedResponse<User>> {
    const response = await api.get('/users', { params });
    return response.data;
  },

  async getUser(id: number): Promise<UserDetail> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async createUser(data: UserFormData): Promise<User> {
    const response = await api.post('/users', data);
    return response.data;
  },

  async updateUser(id: number, data: UserUpdateData): Promise<User> {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async resetPassword(id: number, newPassword: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`, { new_password: newPassword });
  },

  async activateUser(id: number): Promise<void> {
    await api.post(`/users/${id}/activate`);
  },

  async deactivateUser(id: number): Promise<void> {
    await api.post(`/users/${id}/deactivate`);
  },

  async getRoles(): Promise<RoleOption[]> {
    const response = await api.get('/users/roles/list');
    return response.data;
  },
};
