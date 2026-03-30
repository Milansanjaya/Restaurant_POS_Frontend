import api from './axios';
import type { Reservation, ReservationFormData, ReservationStatus } from '../types';

export const reservationsApi = {
  // Get all reservations with optional filters
  getAll: (params?: { status?: ReservationStatus; date?: string }) => 
    api.get<{ reservations: Reservation[] }>('/reservations', { params }).then(res => res.data.reservations),

  // Create a new reservation
  create: (data: ReservationFormData) => 
    api.post<{ reservation: Reservation }>('/reservations', data).then(res => res.data.reservation),

  // Update reservation status
  updateStatus: (id: string, status: ReservationStatus) =>
    api.patch<{ reservation: Reservation }>(`/reservations/${id}/status`, { status }).then(res => res.data.reservation),

  // Seat a reservation
  seat: (id: string) =>
    api.post<{ reservation: Reservation }>(`/reservations/${id}/seat`).then(res => res.data.reservation),
};
