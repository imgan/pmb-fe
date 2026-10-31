import { createCrudApi } from './crudFactory';
import type { Keringanan, StatusKeringanan } from '@/types/entities';

export interface KeringananPayload {
  nim: string;
  tanggal: string;
  jumlahBayar: number;
  berlakuKrs: boolean;
  berlakuUts: boolean;
  berlakuUas: boolean;
  sampaiTanggal: string | null;
  alasan?: string | null;
  status?: StatusKeringanan;
}

export const keringananApi = createCrudApi<Keringanan, KeringananPayload, Partial<KeringananPayload>>(
  'keuangan/keringanan'
);
