import api from './axios';
import type { RestaurantTable, TableFormData, TableStatus } from '../types';

export const tablesApi = {
  // Get all tables
  getAll: () => api.get<RestaurantTable[]>('/tables').then(res => res.data),

  // Create a new table
  create: (data: TableFormData) => 
    api.post<RestaurantTable>('/tables', data).then(res => res.data),

  // Update table status
  updateStatus: (id: string, status: TableStatus) =>
    api.patch<RestaurantTable>(`/tables/${id}/status`, { status }).then(res => res.data),

  // Close table (finalize sale)
  close: (tableId: string, paymentMethod: string) =>
    api.post(`/tables/${tableId}/close`, { paymentMethod }).then(res => res.data),
};