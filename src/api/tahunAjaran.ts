import { createCrudApi } from './crudFactory';
import type { TahunAjaran } from '@/types/entities';

export interface TahunAjaranPayload {
  nama: string;
  tahunMulai: number;
  tahunSelesai: number;
  isActive?: boolean;
}

export const tahunAjaranApi = createCrudApi<TahunAjaran, TahunAjaranPayload, Partial<TahunAjaranPayload>>('tahun-ajaran');
