import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { JenisUjian, LaporanUjianRow } from '@/types/entities';

export interface LaporanUjianQuery {
  tahun?: number;
  jenisUjian?: JenisUjian;
}

export interface LaporanUjianResult {
  data: LaporanUjianRow[];
  grandTotal: number;
}

export const simLaporanUjianApi = {
  async list(query: LaporanUjianQuery = {}): Promise<LaporanUjianResult> {
    const { data } = await http.get<ApiResponse<LaporanUjianRow[]> & { meta: { grandTotal: number } }>('/sim/ujian', {
      params: query,
    });
    return { data: data.data, grandTotal: data.meta.grandTotal };
  },
};
