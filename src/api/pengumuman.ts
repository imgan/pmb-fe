import { createCrudApi } from './crudFactory';
import type { Pengumuman } from '@/types/entities';

export interface PengumumanPayload {
  judul: string;
  isi: string;
  /** null = semua prodi. */
  jurusanId: number | null;
  untuk: 'SEMUA' | 'MAHASISWA' | 'DOSEN';
  tanggalTerbit: string;
  tanggalBerakhir: string | null;
  isPenting: boolean;
  isActive: boolean;
}

export const pengumumanApi = createCrudApi<Pengumuman, PengumumanPayload, Partial<PengumumanPayload>>('pengumuman');
