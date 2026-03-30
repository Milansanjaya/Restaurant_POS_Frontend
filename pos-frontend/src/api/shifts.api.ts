import api from './axios';
import type { Shift } from '../types';

export const shiftsApi = {
  // Open a new shift
  open: (openingCash: number) => 
    api.post<{ shift: Shift }>('/shifts/open', { openingCash }).then(res => res.data.shift),

  // Close the current shift
  close: (closingCash: number) =>
    api.post<{ shift: Shift }>('/shifts/close', { closingCash }).then(res => res.data.shift),
};
