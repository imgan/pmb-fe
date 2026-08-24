import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { PembimbingKe, PembimbingTaSkripsi } from '@/types/entities';

export interface PembimbingTaSkripsiPayload {
  dosenId: number;
  noSk?: string | null;
  tanggalSk?: string | null;
  pembimbingKe: PembimbingKe;
  periodeMulai: string;
  periodeSelesai: string;
}

export interface PembimbingTaSkripsiPeriodeOption {
  periodeMulai: string;
  periodeSelesai: string;
}

export const pembimbingTaSkripsiApi = {
  ...createCrudApi<PembimbingTaSkripsi, PembimbingTaSkripsiPayload, Partial<PembimbingTaSkripsiPayload>>(
    'prodi/pembimbing-ta-skripsi'
  ),
  async filterOptions(): Promise<PembimbingTaSkripsiPeriodeOption[]> {
    const { data } = await http.get<ApiResponse<PembimbingTaSkripsiPeriodeOption[]>>('/prodi/pembimbing-ta-skripsi/filter-options');
    return data.data;
  },
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/prodi/pembimbing-ta-skripsi/export', { responseType: 'blob' });
    return data;
  },
};
