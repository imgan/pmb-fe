import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { KehadiranKelasRow } from '@/types/entities';

export interface KehadiranKelasQuery {
  tahun?: number;
  semester?: number;
}

export const simKehadiranKelasApi = {
  async list(query: KehadiranKelasQuery = {}): Promise<KehadiranKelasRow[]> {
    const { data } = await http.get<ApiResponse<KehadiranKelasRow[]>>('/sim/kehadiran-kelas', { params: query });
    return data.data;
  },
};
