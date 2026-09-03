import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { KasirDashboard } from '@/types/entities';

export const kasirDashboardApi = {
  async get(): Promise<KasirDashboard> {
    const { data } = await http.get<ApiResponse<KasirDashboard>>('/keuangan/kasir-dashboard');
    return data.data;
  },
};
