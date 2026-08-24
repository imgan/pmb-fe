import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { Dosen, VocDosenFtidDetail } from '@/types/entities';

export interface VocUjianDosenPayload {
  jumlah?: number;
  tanggalBerkas?: string | null;
  pengawasRealId?: number | null;
}

export const vocDosenFtidApi = {
  async list(query?: ListQuery): Promise<ListResult<Dosen>> {
    const { data } = await http.get<ApiResponse<Dosen[]> & { meta: ListResult<Dosen>['meta'] }>('/prodi/voc-dosen-ftid', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },

  async detail(dosenId: number): Promise<VocDosenFtidDetail> {
    const { data } = await http.get<ApiResponse<VocDosenFtidDetail>>(`/prodi/voc-dosen-ftid/${dosenId}/detail`);
    return data.data;
  },

  async updateJadwal(jadwalKuliahId: number, payload: VocUjianDosenPayload): Promise<void> {
    await http.put(`/prodi/voc-dosen-ftid/jadwal/${jadwalKuliahId}`, payload);
  },

  async cetakPdf(dosenId: number): Promise<Blob> {
    const { data } = await http.get(`/prodi/voc-dosen-ftid/${dosenId}/pdf`, { responseType: 'blob' });
    return data;
  },
};
