import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { LaporanIpkRow, SemesterGanjilGenap } from '@/types/entities';

export interface LaporanIpkQuery {
  tahun?: number;
  semester?: SemesterGanjilGenap;
}

export const simIpkApi = {
  async list(query: LaporanIpkQuery = {}): Promise<LaporanIpkRow[]> {
    const { data } = await http.get<ApiResponse<LaporanIpkRow[]>>('/sim/ipk', { params: query });
    return data.data;
  },
};
