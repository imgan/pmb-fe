import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { RekapitulasiPengajaranRow } from '@/types/entities';

export interface RekapitulasiPengajaranQuery {
  tahunAjaranId?: number;
}

export const simRekapitulasiPengajaranApi = {
  async list(query: RekapitulasiPengajaranQuery = {}): Promise<RekapitulasiPengajaranRow[]> {
    const { data } = await http.get<ApiResponse<RekapitulasiPengajaranRow[]>>('/sim/rekapitulasi-pengajaran', {
      params: query,
    });
    return data.data;
  },
};
