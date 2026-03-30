import api from './axios';
import type { Category, CategoryFormData } from '../types';

export const categoriesApi = {
  getAll: async () => {
    const res = await api.get<{ categories: Category[] }>('/categories');
    return res.data.categories;
  },

  getById: async (id: string) => {
    const res = await api.get<{ category: Category }>(`/categories/${id}`);
    return res.data.category;
  },

  create: async (data: CategoryFormData) => {
    const res = await api.post<{ category: Category }>('/categories', data);
    return res.data.category;
  },

  update: async (id: string, data: Partial<CategoryFormData>) => {
    const res = await api.put<{ category: Category }>(`/categories/${id}`, data);
    return res.data.category;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};
