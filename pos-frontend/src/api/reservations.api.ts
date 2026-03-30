import api from './axios';
import type { Reservation, ReservationFormData, ReservationStatus } from '../types';

export const reservationsApi = {
  // Get all reservations with optional filters
  getAll: (params?: { status?: ReservationStatus; date?: string }) => 
    api.get<Reservation[]>('/reservations', { params }).then(res => res.data),

  // Create a new reservation
  create: (data: ReservationFormData) => 
    api.post<Reservation>('/reservations', data).then(res => res.data),

  // Update reservation status
  updateStatus: (id: string, status: ReservationStatus) =>
    api.patch<Reservation>(`/reservations/${id}/status`, { status }).then(res => res.data),

  // Seat a reservation
  seat: (id: string) =>
    api.post<Reservation>(`/reservations/${id}/seat`).then(res => res.data),
};
