import { createCrudApi } from './crudFactory';
import type { BimbinganMagang } from '@/types/entities';

export interface BimbinganMagangPayload {
  mahasiswaId: number;
  pembimbingMagangId?: number | null;
  judul?: string | null;
  nilai?: string | null;
  kelas?: string | null;
}

export const bimbinganMagangApi = createCrudApi<BimbinganMagang, BimbinganMagangPayload, Partial<BimbinganMagangPayload>>(
  'prodi/bimbingan-magang'
);
