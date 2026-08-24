import { createCrudApi } from './crudFactory';
import type { JadwalSidang, SemesterGanjilGenap } from '@/types/entities';

export interface JadwalSidangPayload {
  tahunAjaranId: number;
  semester: SemesterGanjilGenap;
  jurusanId: number;
  tanggal: string;
  jam: string;
  ruangan?: string | null;
  noSk?: string | null;
  dosenPengujiId?: number | null;
}

export const jadwalSidangApi = createCrudApi<JadwalSidang, JadwalSidangPayload, Partial<JadwalSidangPayload>>(
  'prodi/jadwal-sidang'
);
