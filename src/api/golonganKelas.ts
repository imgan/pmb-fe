import { createCrudApi } from './crudFactory';
import type { GolonganKelas } from '@/types/entities';

export interface GolonganKelasPayload {
  namaKelas: string;
}

export const golonganKelasApi = createCrudApi<GolonganKelas, GolonganKelasPayload, Partial<GolonganKelasPayload>>(
  'golongan-kelas'
);
