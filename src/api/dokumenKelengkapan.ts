import { createCrudApi } from './crudFactory';
import type { DokumenKelengkapan } from '@/types/entities';

export interface DokumenKelengkapanPayload {
  namaKelengkapan: string;
  isWajib?: boolean;
  isBeasiswa?: boolean;
  file?: string | null;
}

export const dokumenKelengkapanApi = createCrudApi<
  DokumenKelengkapan,
  DokumenKelengkapanPayload,
  Partial<DokumenKelengkapanPayload>
>('dokumen-kelengkapan');
