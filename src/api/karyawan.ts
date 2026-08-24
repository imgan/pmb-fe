import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { Karyawan, KaryawanGenderSummary } from '@/types/entities';

export interface KaryawanPayload {
  nip: string;
  idFinger?: string | null;
  namaLengkap: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  pendidikanAkhir?: string | null;
  agama?: string | null;
  telpHp?: string | null;
  email?: string | null;
  alamat?: string | null;
  bagian?: string | null;
  jabatan?: string | null;
  status?: string | null;
  tmt?: string | null;
  isActive?: boolean;
}

export const karyawanApi = {
  ...createCrudApi<Karyawan, KaryawanPayload, Partial<KaryawanPayload>>('karyawan'),
  async genderSummary(): Promise<KaryawanGenderSummary> {
    const { data } = await http.get<ApiResponse<KaryawanGenderSummary>>('/karyawan/summary');
    return data.data;
  },
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/karyawan/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/karyawan/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/karyawan/import-template', { responseType: 'blob' });
    return data;
  },
};
