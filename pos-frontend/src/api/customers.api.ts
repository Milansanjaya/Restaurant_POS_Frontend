import api from './axios';
import type {
  Customer,
  CustomerFormData,
  PaginationParams,
  CustomerTier,
  CustomerStatus,
} from '../types';

export const customersApi = {
  getAll: async (
    params?: PaginationParams & { status?: CustomerStatus; tier?: CustomerTier }
  ) => {
    const res = await api.get<{ success: boolean; data: Customer[]; pagination?: any }>('/customers', { params });
    // Backend returns { success, data: [...] } but CustomersPage expects { customers: [...] }
    return { customers: res.data.data, ...res.data.pagination };
  },

  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: Customer }>(`/customers/${id}`);
    return res.data.data;
  },

  getByPhone: async (phone: string) => {
    const res = await api.get<{ success: boolean; data: Customer }>(`/customers/phone/${encodeURIComponent(phone)}`);
    return res.data.data;
  },

  getWalkIn: async () => {
    const res = await api.get<{ success: boolean; data: Customer }>('/customers/walk-in');
    return res.data.data;
  },

  create: async (data: CustomerFormData) => {
    const res = await api.post<{ success: boolean; message: string; data: Customer }>('/customers', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CustomerFormData>) => {
    const res = await api.put<{ success: boolean; message: string; data: Customer }>(`/customers/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },

  getHistory: async (id: string) => {
    const res = await api.get(`/customers/${id}/history`);
    return res.data;
  },
};
