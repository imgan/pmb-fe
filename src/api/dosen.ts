import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { Dosen, DosenStatItem } from '@/types/entities';

export interface DosenPayload {
  nik?: string | null;
  nidn: string;
  namaLengkap: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  pendidikanAkhir?: string | null;
  agama?: string | null;
  telpHp?: string | null;
  email?: string | null;
  alamat?: string | null;
  statusDosen?: 'TETAP' | 'TIDAK_TETAP' | null;
  status?: string | null;
  waktu?: 'M' | 'P' | null;
  tmt?: string | null;
  karyawanInternal?: boolean;
  infaq?: boolean;
  kelompokFakultas: 'FKF' | 'FTID' | 'FIP' | 'NON_BASE';
  isActive?: boolean;
}

const baseApi = createCrudApi<Dosen, DosenPayload, Partial<DosenPayload>>('dosen');

export const dosenApi = {
  ...baseApi,

  async stats(): Promise<DosenStatItem[]> {
    const { data } = await http.get<ApiResponse<DosenStatItem[]>>('/dosen/stats');
    return data.data;
  },
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/dosen/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/dosen/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/dosen/import-template', { responseType: 'blob' });
    return data;
  },
};
