import api from './axios';
import type { SystemConfig, TaxSetting } from '../types';

export const configApi = {
  get: async () => {
    const res = await api.get<{ data: SystemConfig }>('/config');
    return res.data.data; // Backend returns { success, data: config }
  },

  update: async (data: Partial<SystemConfig>) => {
    const res = await api.put<{ config: SystemConfig }>('/config', data);
    return res.data.config;
  },

  updateTax: async (taxes: TaxSetting[]) => {
    const res = await api.put<{ config: SystemConfig }>('/config/tax', { taxes });
    return res.data.config;
  },

  uploadLogo: async (logo: string) => {
    const res = await api.post('/config/logo', { logo });
    return res.data;
  },
};
