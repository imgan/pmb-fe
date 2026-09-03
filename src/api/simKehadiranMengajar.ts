import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { KehadiranMengajarRow } from '@/types/entities';

export interface KehadiranMengajarQuery {
  tahunAjaranId?: number;
  dosenId?: number;
}

export const simKehadiranMengajarApi = {
  async list(query: KehadiranMengajarQuery = {}): Promise<KehadiranMengajarRow[]> {
    const { data } = await http.get<ApiResponse<KehadiranMengajarRow[]>>('/sim/kehadiran-mengajar', { params: query });
    return data.data;
  },
};
