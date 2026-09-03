import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { LaporanLulusanRow, ProdiOption } from '@/types/entities';

export interface LaporanLulusanQuery {
  tahun?: number;
  jurusanId?: number;
}

export const simLulusanApi = {
  async list(query: LaporanLulusanQuery = {}): Promise<LaporanLulusanRow[]> {
    const { data } = await http.get<ApiResponse<LaporanLulusanRow[]>>('/sim/lulusan', { params: query });
    return data.data;
  },
  async tahunLulusOptions(): Promise<number[]> {
    const { data } = await http.get<ApiResponse<number[]>>('/sim/lulusan/tahun-lulus-options');
    return data.data;
  },
  async prodiOptions(): Promise<ProdiOption[]> {
    const { data } = await http.get<ApiResponse<ProdiOption[]>>('/sim/lulusan/prodi-options');
    return data.data;
  },
};
