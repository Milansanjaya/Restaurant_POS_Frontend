import api from './axios';
import type { Coupon, CouponFormData } from '../types';

export const couponsApi = {
  // Get all coupons
  getAll: () => 
    api.get<Coupon[]>('/coupons').then(res => res.data),

  // Create a new coupon
  create: (data: CouponFormData) => 
    api.post<{ coupon: Coupon }>('/coupons', data).then(res => res.data.coupon),

  // Update a coupon
  update: (id: string, data: Partial<CouponFormData>) =>
    api.patch<{ coupon: Coupon }>(`/coupons/${id}`, data).then(res => res.data.coupon),

  // Toggle coupon active status
  toggle: (id: string) =>
    api.patch<{ coupon: Coupon }>(`/coupons/${id}/toggle`).then(res => res.data.coupon),

  // Delete a coupon
  delete: (id: string) =>
    api.delete(`/coupons/${id}`).then(res => res.data),
};
