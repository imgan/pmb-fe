import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { LaporanAktifGroup, SemesterGanjilGenap } from '@/types/entities';

export interface LaporanAktifQuery {
  tahun?: number;
  semester?: SemesterGanjilGenap;
}

export const laporanAktifApi = {
  async list(query: LaporanAktifQuery = {}): Promise<LaporanAktifGroup[]> {
    const { data } = await http.get<ApiResponse<LaporanAktifGroup[]>>('/sim/aktif', { params: query });
    return data.data;
  },
};
