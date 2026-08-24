import { createCrudApi } from './crudFactory';
import type { DokumenPendaftaran } from '@/types/entities';

export interface DokumenPendaftaranPayload {
  namaPendaftaran: string;
  isWajib?: boolean;
}

export const dokumenPendaftaranApi = createCrudApi<
  DokumenPendaftaran,
  DokumenPendaftaranPayload,
  Partial<DokumenPendaftaranPayload>
>('dokumen-pendaftaran');
