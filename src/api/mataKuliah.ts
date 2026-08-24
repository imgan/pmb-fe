import { createCrudApi } from './crudFactory';
import type { MataKuliah } from '@/types/entities';

export interface MataKuliahPayload {
  kodeMk: string;
  namaMk: string;
  sks: number;
}

export const mataKuliahApi = createCrudApi<MataKuliah, MataKuliahPayload, Partial<MataKuliahPayload>>('mata-kuliah');
