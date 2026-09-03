import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { TarifPembimbing } from '@/types/entities';

export interface TarifPembimbingPayload {
  periode: number;
  jurusanId: number;
  biayaPembimbingUtama: number;
  biayaPembimbingPendamping?: number;
  biayaPembimbingAsisten?: number;
  biayaPembimbingTunggal?: number;
  isActive?: boolean;
}

const baseApi = createCrudApi<TarifPembimbing, TarifPembimbingPayload, Partial<TarifPembimbingPayload>>(
  'keuangan/tarif-pembimbing'
);

export const tarifPembimbingApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-pembimbing/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/tarif-pembimbing/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tarif-pembimbing/import-template', { responseType: 'blob' });
    return data;
  },
};
