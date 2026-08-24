import { createCrudApi } from './crudFactory';
import type { PembimbingMagang } from '@/types/entities';

export interface PembimbingMagangPayload {
  dosenId: number;
  noSk?: string | null;
  tanggalSk?: string | null;
}

export const pembimbingMagangApi = createCrudApi<PembimbingMagang, PembimbingMagangPayload, Partial<PembimbingMagangPayload>>(
  'prodi/pembimbing-magang'
);
