import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { StatusBelajarKuliah, TarifKuliah } from '@/types/entities';

export interface TarifKuliahPayload {
  jurusanId: number;
  tahunAngkatan: number;
  semester: number;
  biayaSks: number;
  biayaBpp?: number;
  biayaSpp?: number;
  statusBelajar: StatusBelajarKuliah;
  isActive?: boolean;
}

const baseApi = createCrudApi<TarifKuliah, TarifKuliahPayload, Partial<TarifKuliahPayload>>('keuangan/tarif-kuliah');

export const tarifKuliahApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-kuliah/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/tarif-kuliah/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-kuliah/import-template', { responseType: 'blob' });
    return data;
  },
};
