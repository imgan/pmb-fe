import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { GenerateTagihanResult, TagihanKuliah } from '@/types/entities';

export const tagihanKuliahApi = {
  async list(query?: ListQuery): Promise<ListResult<TagihanKuliah>> {
    const { data } = await http.get<ApiResponse<TagihanKuliah[]> & { meta: ListResult<TagihanKuliah>['meta'] }>(
      '/keuangan/generate-tagihan',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async generate(tahunAjaranId: number): Promise<GenerateTagihanResult> {
    const { data } = await http.post<ApiResponse<GenerateTagihanResult>>('/keuangan/generate-tagihan/generate', {
      tahunAjaranId,
    });
    return data.data;
  },
  async cariByNim(nim: string, tahunAjaranId?: number): Promise<TagihanKuliah[]> {
    const { data } = await http.get<ApiResponse<TagihanKuliah[]>>('/keuangan/generate-tagihan/cari', {
      params: { nim, tahunAjaranId },
    });
    return data.data;
  },
};
