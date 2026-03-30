import api from './axios';
import type { Unit, UnitFormData, PaginationParams, UnitType } from '../types';

export const unitsApi = {
  getAll: async (params?: PaginationParams & { type?: UnitType; isActive?: boolean }) => {
    const res = await api.get('/units', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<{ unit: Unit }>(`/units/${id}`);
    return res.data.unit;
  },

  create: async (data: UnitFormData) => {
    const res = await api.post<{ unit: Unit }>('/units', data);
    return res.data.unit;
  },

  update: async (id: string, data: Partial<UnitFormData>) => {
    const res = await api.put<{ unit: Unit }>(`/units/${id}`, data);
    return res.data.unit;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/units/${id}`);
    return res.data;
  },
};
