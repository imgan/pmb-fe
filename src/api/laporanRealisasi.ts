import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { RealisasiMengajarItem } from '@/types/entities';

export const laporanRealisasiApi = {
  async list(query?: ListQuery): Promise<ListResult<RealisasiMengajarItem>> {
    const { data } = await http.get<ApiResponse<RealisasiMengajarItem[]> & { meta: ListResult<RealisasiMengajarItem>['meta'] }>(
      '/laporan/cetak-realisasi',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },

  async kelasOptions(): Promise<string[]> {
    const { data } = await http.get<ApiResponse<string[]>>('/laporan/cetak-realisasi/kelas-options');
    return data.data;
  },
};
