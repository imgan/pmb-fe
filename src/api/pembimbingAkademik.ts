import { createCrudApi } from './crudFactory';
import type { PembimbingAkademik } from '@/types/entities';

export interface PembimbingAkademikPayload {
  dosenId: number;
  noSk?: string | null;
  tanggalSk?: string | null;
}

export const pembimbingAkademikApi = createCrudApi<
  PembimbingAkademik,
  PembimbingAkademikPayload,
  Partial<PembimbingAkademikPayload>
>('prodi/pembimbing-akademik');
