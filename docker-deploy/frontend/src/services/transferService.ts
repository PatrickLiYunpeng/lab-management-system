import api from './api';
import type {
  BorrowRequest,
  BorrowRequestFormData,
  BorrowRequestFilters,
  PaginatedResponse,
} from '../types';

interface GetBorrowRequestParams extends BorrowRequestFilters {
  page?: number;
  page_size?: number;
}

export const transferService = {
  async getBorrowRequests(params?: GetBorrowRequestParams): Promise<PaginatedResponse<BorrowRequest>> {
    const response = await api.get<PaginatedResponse<BorrowRequest>>('/personnel/borrow-requests/', {
      params,
    });
    return response.data;
  },

  async createBorrowRequest(data: BorrowRequestFormData): Promise<BorrowRequest> {
    const response = await api.post<BorrowRequest>('/personnel/borrow-requests', data);
    return response.data;
  },

  async approveBorrowRequest(
    requestId: number,
    approved: boolean,
    rejectionReason?: string
  ): Promise<BorrowRequest> {
    const response = await api.post<BorrowRequest>(
      `/personnel/borrow-requests/${requestId}/approve`,
      {
        approved,
        rejection_reason: rejectionReason,
      }
    );
    return response.data;
  },
};
