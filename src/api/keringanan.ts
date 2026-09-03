import { createCrudApi } from './crudFactory';
import type { Keringanan, StatusKeringanan } from '@/types/entities';

export interface KeringananPayload {
  nim: string;
  tanggal: string;
  jumlahBayar: number;
  alasan?: string | null;
  status?: StatusKeringanan;
}

export const keringananApi = createCrudApi<Keringanan, KeringananPayload, Partial<KeringananPayload>>(
  'keuangan/keringanan'
);
