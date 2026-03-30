import api from './axios';
import type { Coupon, CouponFormData } from '../types';

export const couponsApi = {
  // Get all coupons
  getAll: () => 
    api.get<Coupon[]>('/coupons').then(res => res.data),

  // Create a new coupon
  create: (data: CouponFormData) => 
    api.post<Coupon>('/coupons', data).then(res => res.data),

  // Update a coupon
  update: (id: string, data: Partial<CouponFormData>) =>
    api.patch<Coupon>(`/coupons/${id}`, data).then(res => res.data),

  // Delete a coupon
  delete: (id: string) =>
    api.delete(`/coupons/${id}`).then(res => res.data),

  // Validate a coupon code
  validate: (code: string, orderTotal: number) =>
    api.post<{ valid: boolean; coupon?: Coupon; discount?: number; message?: string }>(
      '/coupons/validate',
      { code, orderTotal }
    ).then(res => res.data),
};
