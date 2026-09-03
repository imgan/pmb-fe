import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { LaporanFrsRow, SemesterGanjilGenap } from '@/types/entities';

export interface LaporanFrsQuery {
  tahun?: number;
  semester?: SemesterGanjilGenap;
}

export const simFrsApi = {
  async list(query: LaporanFrsQuery = {}): Promise<LaporanFrsRow[]> {
    const { data } = await http.get<ApiResponse<LaporanFrsRow[]>>('/sim/frs', { params: query });
    return data.data;
  },
};
