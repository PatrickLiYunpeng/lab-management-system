import api from './api';
import type {
  Shift,
  ShiftFormData,
  ShiftUpdateData,
  ShiftFilters,
  PersonnelShift,
  PersonnelShiftFormData,
  PersonnelShiftUpdateData,
  PaginatedResponse,
} from '../types';

export interface ShiftListParams extends ShiftFilters {
  page?: number;
  page_size?: number;
}

export const shiftService = {
  // Shifts CRUD
  async getShifts(params?: ShiftListParams): Promise<PaginatedResponse<Shift>> {
    const response = await api.get<PaginatedResponse<Shift>>('/shifts', { params });
    return response.data;
  },

  async getShiftById(id: number): Promise<Shift> {
    const response = await api.get<Shift>(`/shifts/${id}`);
    return response.data;
  },

  async createShift(data: ShiftFormData): Promise<Shift> {
    const response = await api.post<Shift>('/shifts', data);
    return response.data;
  },

  async updateShift(id: number, data: ShiftUpdateData): Promise<Shift> {
    const response = await api.put<Shift>(`/shifts/${id}`, data);
    return response.data;
  },

  async deleteShift(id: number): Promise<void> {
    await api.delete(`/shifts/${id}`);
  },

  // Personnel by shift
  async getPersonnelByShift(
    shiftId: number,
    params?: { active_on?: string }
  ): Promise<PersonnelShift[]> {
    const response = await api.get<PersonnelShift[]>(`/shifts/${shiftId}/personnel`, { params });
    return response.data;
  },

  // Personnel shifts
  async getPersonnelShifts(personnelId: number): Promise<PersonnelShift[]> {
    const response = await api.get<PersonnelShift[]>(`/shifts/personnel/${personnelId}`);
    return response.data;
  },

  async assignShiftToPersonnel(personnelId: number, data: PersonnelShiftFormData): Promise<PersonnelShift> {
    const response = await api.post<PersonnelShift>(`/shifts/personnel/${personnelId}`, data);
    return response.data;
  },

  async updatePersonnelShift(
    personnelId: number,
    shiftId: number,
    data: PersonnelShiftUpdateData
  ): Promise<PersonnelShift> {
    const response = await api.put<PersonnelShift>(
      `/shifts/personnel/${personnelId}/shifts/${shiftId}`,
      data
    );
    return response.data;
  },

  async removePersonnelShift(personnelId: number, shiftId: number): Promise<void> {
    await api.delete(`/shifts/personnel/${personnelId}/shifts/${shiftId}`);
  },
};
