import api from './axios';
import type { Shift } from '../types';

export const shiftsApi = {
  // Open a new shift
  open: (openingCash: number) => 
    api.post<Shift>('/shifts/open', { openingCash }).then(res => res.data),

  // Close the current shift
  close: (closingCash: number) =>
    api.post<Shift>('/shifts/close', { closingCash }).then(res => res.data),
};
