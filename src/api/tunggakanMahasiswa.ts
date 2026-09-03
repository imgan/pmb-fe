import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { TunggakanMahasiswa } from '@/types/entities';

export interface TunggakanMahasiswaPayload {
  nim: string;
  tanggal: string;
  nominal: number;
  keterangan?: string | null;
}

const baseApi = createCrudApi<TunggakanMahasiswa, TunggakanMahasiswaPayload, Partial<TunggakanMahasiswaPayload>>(
  'keuangan/tunggakan-mahasiswa'
);

export const tunggakanMahasiswaApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tunggakan-mahasiswa/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/tunggakan-mahasiswa/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tunggakan-mahasiswa/import-template', { responseType: 'blob' });
    return data;
  },
};
