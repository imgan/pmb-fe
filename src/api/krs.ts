import { createCrudApi } from './crudFactory';
import type { Krs, StatusKrs } from '@/types/entities';

export interface KrsPayload {
  mahasiswaId: number;
  semester: number;
  tahunAjaranId: number;
  status?: StatusKrs;
  jadwalKuliahIds?: number[];
}

export const krsApi = createCrudApi<Krs, KrsPayload, Partial<KrsPayload>>('krs');
