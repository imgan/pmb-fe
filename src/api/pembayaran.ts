import { createCrudApi } from './crudFactory';
import type { Pembayaran } from '@/types/entities';

export interface PembayaranPayload {
  namaPembayaran: string;
  isBeasiswa?: boolean;
}

export const pembayaranApi = createCrudApi<Pembayaran, PembayaranPayload, Partial<PembayaranPayload>>('pembayaran');
