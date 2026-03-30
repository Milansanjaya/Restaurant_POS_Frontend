import api from './axios';
import type { GRN, GRNFormData, PaginationParams } from '../types';

export const grnApi = {
  getAll: async (params?: PaginationParams & { status?: string; supplierId?: string }) => {
    const res = await api.get('/grn', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ grn: GRN }>(`/grn/${id}`);
    return res.data.grn;
  },

  create: async (data: GRNFormData) => {
    const res = await api.post<{ grn: GRN }>('/grn', data);
    return res.data.grn;
  },

  approve: async (id: string) => {
    const res = await api.put(`/grn/${id}/approve`);
    return res.data;
  },
};
