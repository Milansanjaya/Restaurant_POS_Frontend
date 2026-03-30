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
    const res = await api.get('/customers', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ customer: Customer }>(`/customers/${id}`);
    return res.data.customer;
  },

  getByPhone: async (phone: string) => {
    const res = await api.get<{ customer: Customer }>(`/customers/phone/${encodeURIComponent(phone)}`);
    return res.data.customer;
  },

  getWalkIn: async () => {
    const res = await api.get<{ customer: Customer }>('/customers/walk-in');
    return res.data.customer;
  },

  create: async (data: CustomerFormData) => {
    const res = await api.post<{ customer: Customer }>('/customers', data);
    return res.data.customer;
  },

  update: async (id: string, data: Partial<CustomerFormData>) => {
    const res = await api.put<{ customer: Customer }>(`/customers/${id}`, data);
    return res.data.customer;
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
