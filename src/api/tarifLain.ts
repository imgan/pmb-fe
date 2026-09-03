import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { TarifLain } from '@/types/entities';

export interface TarifLainPayload {
  kodeBiaya: string;
  tahunMasuk: number;
  biaya: number;
  keterangan?: string | null;
  isActive?: boolean;
}

const baseApi = createCrudApi<TarifLain, TarifLainPayload, Partial<TarifLainPayload>>('keuangan/tarif-lain');

export const tarifLainApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-lain/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/tarif-lain/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-lain/import-template', { responseType: 'blob' });
    return data;
  },
};
