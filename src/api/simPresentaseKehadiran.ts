import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { PresentaseKehadiranRow, SemesterGanjilGenap } from '@/types/entities';

export interface PresentaseKehadiranQuery {
  tahun?: number;
  semester?: SemesterGanjilGenap;
}

export const simPresentaseKehadiranApi = {
  async list(query: PresentaseKehadiranQuery = {}): Promise<PresentaseKehadiranRow[]> {
    const { data } = await http.get<ApiResponse<PresentaseKehadiranRow[]>>('/sim/presentase-kehadiran', { params: query });
    return data.data;
  },
};
