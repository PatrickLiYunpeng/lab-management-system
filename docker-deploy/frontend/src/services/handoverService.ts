import api from './api';
import type {
  Handover,
  HandoverFormData,
  HandoverFilters,
  HandoverNote,
  PaginatedResponse,
} from '../types';

interface GetHandoversParams extends HandoverFilters {
  page?: number;
  page_size?: number;
}

export const handoverService = {
  async getHandovers(params: GetHandoversParams = {}): Promise<PaginatedResponse<Handover>> {
    const response = await api.get<PaginatedResponse<Handover>>('/handovers', { params });
    return response.data;
  },

  async getPendingHandovers(): Promise<Handover[]> {
    const response = await api.get<Handover[]>('/handovers/pending');
    return response.data;
  },

  async getHandoverById(id: number): Promise<Handover> {
    const response = await api.get<Handover>(`/handovers/${id}`);
    return response.data;
  },

  async createHandover(data: HandoverFormData): Promise<Handover> {
    const response = await api.post<Handover>('/handovers', data);
    return response.data;
  },

  async updateHandover(id: number, data: Partial<HandoverFormData>): Promise<Handover> {
    const response = await api.put<Handover>(`/handovers/${id}`, data);
    return response.data;
  },

  async acceptHandover(id: number, acceptanceNotes?: string): Promise<Handover> {
    const response = await api.post<Handover>(`/handovers/${id}/accept`, {
      acceptance_notes: acceptanceNotes,
    });
    return response.data;
  },

  async rejectHandover(id: number, rejectionReason: string): Promise<Handover> {
    const response = await api.post<Handover>(`/handovers/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  async cancelHandover(id: number): Promise<Handover> {
    const response = await api.post<Handover>(`/handovers/${id}/cancel`);
    return response.data;
  },

  async addNote(handoverId: number, content: string, isImportant: boolean = false): Promise<HandoverNote> {
    const response = await api.post<HandoverNote>(`/handovers/${handoverId}/notes`, {
      content,
      is_important: isImportant,
    });
    return response.data;
  },
};
