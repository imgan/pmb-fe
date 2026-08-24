import { createCrudApi } from './crudFactory';
import type { DinasCutiLupaFinger, DinasCutiStatus } from '@/types/entities';

export interface DinasCutiPayload {
  karyawanId: number;
  tanggalKehadiran: string;
  status: DinasCutiStatus;
  keperluan?: string | null;
  lampiranNama?: string | null;
  lampiran?: string | null;
}

export const dinasCutiLupaFingerApi = createCrudApi<DinasCutiLupaFinger, DinasCutiPayload, Partial<DinasCutiPayload>>(
  'dinas-cuti-lupa-finger'
);
