import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { CetakDokumenData, LulusanItem } from '@/types/entities';

export const laporanIjazahApi = {
  async list(query?: ListQuery): Promise<ListResult<LulusanItem>> {
    const { data } = await http.get<ApiResponse<LulusanItem[]> & { meta: ListResult<LulusanItem>['meta'] }>(
      '/laporan/ijazah-transkrip',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },

  async tahunLulusOptions(): Promise<number[]> {
    const { data } = await http.get<ApiResponse<number[]>>('/laporan/ijazah-transkrip/tahun-lulus-options');
    return data.data;
  },

  async cetakData(mahasiswaId: number | string): Promise<CetakDokumenData> {
    const { data } = await http.get<ApiResponse<CetakDokumenData>>(`/laporan/ijazah-transkrip/${mahasiswaId}/cetak`);
    return data.data;
  },

  async cetakPdf(mahasiswaId: number | string, jenis: string): Promise<Blob> {
    const { data } = await http.get(`/laporan/ijazah-transkrip/${mahasiswaId}/cetak/${jenis}/pdf`, {
      responseType: 'blob',
    });
    return data;
  },
};
