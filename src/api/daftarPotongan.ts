import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { DaftarPotongan } from '@/types/entities';

export interface DaftarPotonganPayload {
  nim: string;
  biaya: number;
  semester?: number | null;
  alasan?: string | null;
  asal?: string | null;
}

const baseApi = createCrudApi<DaftarPotongan, DaftarPotonganPayload, Partial<DaftarPotonganPayload>>(
  'keuangan/daftar-potongan'
);

export const daftarPotonganApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/daftar-potongan/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/daftar-potongan/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/daftar-potongan/import-template', { responseType: 'blob' });
    return data;
  },
};
