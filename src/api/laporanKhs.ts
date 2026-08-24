import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { KhsMahasiswaItem } from '@/types/entities';

export const laporanKhsApi = {
  async list(query?: ListQuery): Promise<ListResult<KhsMahasiswaItem>> {
    const { data } = await http.get<ApiResponse<KhsMahasiswaItem[]> & { meta: ListResult<KhsMahasiswaItem>['meta'] }>(
      '/laporan/cetak-khs',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },

  async cetakPdf(mahasiswaId: number, semester: number): Promise<Blob> {
    const { data } = await http.get(`/laporan/cetak-khs/${mahasiswaId}/pdf`, {
      params: { semester },
      responseType: 'blob',
    });
    return data;
  },
};
