import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { Dosen, DosenProdiStatItem, DosenStatItem } from '@/types/entities';

export interface DosenPayload {
  nik?: string | null;
  nidn: string;
  nuptk?: string | null;
  namaLengkap: string;
  gelar?: string | null;
  jurusanId?: number | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  pendidikanAkhir?: string | null;
  agama?: string | null;
  telpHp?: string | null;
  noWhatsapp?: string | null;
  jabatanFungsional?: string | null;
  kum?: number | null;
  email?: string | null;
  alamat?: string | null;
  statusDosen?: 'TETAP' | 'TIDAK_TETAP' | null;
  jenisDosen?: 'INTERNAL' | 'EKSTERNAL';
  keterangan?: string | null;
  status?: string | null;
  waktu?: 'M' | 'P' | null;
  tmt?: string | null;
  karyawanInternal?: boolean;
  infaq?: boolean;
  kelompokFakultas?: 'FKF' | 'FTID' | 'FIP' | 'NON_BASE';
  isActive?: boolean;
}

const baseApi = createCrudApi<Dosen, DosenPayload, Partial<DosenPayload>>('dosen');

export const dosenApi = {
  ...baseApi,

  async stats(): Promise<DosenStatItem[]> {
    const { data } = await http.get<ApiResponse<DosenStatItem[]>>('/dosen/stats');
    return data.data;
  },
  async statsByProdi(): Promise<DosenProdiStatItem[]> {
    const { data } = await http.get<ApiResponse<DosenProdiStatItem[]>>('/dosen/stats', { params: { groupBy: 'prodi' } });
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
