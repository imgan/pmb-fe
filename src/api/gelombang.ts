import { createCrudApi } from './crudFactory';
import type { Gelombang, StatusGelombang } from '@/types/entities';

export interface GelombangPayload {
  namaGelombang: string;
  /** Tahun Ajaran PMB (opsional). */
  tahunPmbId?: number | null;
  startDate: string;
  endDate: string;
  deskripsi?: string | null;
  status?: StatusGelombang;
}

export const gelombangApi = createCrudApi<Gelombang, GelombangPayload, Partial<GelombangPayload>>('gelombang');
