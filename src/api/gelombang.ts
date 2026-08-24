import { createCrudApi } from './crudFactory';
import type { Gelombang } from '@/types/entities';

export interface GelombangPayload {
  namaGelombang: string;
  startDate: string;
  endDate: string;
  deskripsi?: string | null;
}

export const gelombangApi = createCrudApi<Gelombang, GelombangPayload, Partial<GelombangPayload>>('gelombang');
