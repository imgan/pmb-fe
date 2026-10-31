import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { KehadiranDosen, KehadiranStatusSummaryItem, StatusKehadiranDosen } from '@/types/entities';

export interface KehadiranDosenPayload {
  jadwalKuliahId: number;
  dosenId: number;
  tanggalRealisasi: string;
  status?: StatusKehadiranDosen;
  uraian?: string | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<KehadiranDosen, KehadiranDosenPayload, Partial<KehadiranDosenPayload>>(
  'kehadiran-dosen'
);

export const kehadiranDosenApi = {
  ...baseApi,

  async statusSummary(): Promise<KehadiranStatusSummaryItem[]> {
    const { data } = await http.get<ApiResponse<KehadiranStatusSummaryItem[]>>('/kehadiran-dosen/status-summary');
    return data.data;
  },
};
