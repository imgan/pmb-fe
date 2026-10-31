import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { TarifTaSkripsi } from '@/types/entities';

export interface TarifTaSkripsiPayload {
  periode: number;
  tahunAjaranId: number;
  jurusanId: number;
  biayaPendaftaran: number;
  biayaPerpanjangan?: number;
  isActive?: boolean;
}

const baseApi = createCrudApi<TarifTaSkripsi, TarifTaSkripsiPayload, Partial<TarifTaSkripsiPayload>>(
  'keuangan/tarif-ta-skripsi'
);

export const tarifTaSkripsiApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-ta-skripsi/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/tarif-ta-skripsi/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-ta-skripsi/import-template', { responseType: 'blob' });
    return data;
  },
};
