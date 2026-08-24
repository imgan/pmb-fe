import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { NilaiPerkelasDetail, NilaiPerkelasItem } from '@/types/entities';

export const nilaiPerkelasApi = {
  async list(query?: ListQuery): Promise<ListResult<NilaiPerkelasItem>> {
    const { data } = await http.get<ApiResponse<NilaiPerkelasItem[]> & { meta: ListResult<NilaiPerkelasItem>['meta'] }>(
      '/prodi/nilai-perkelas',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async kelasOptions(): Promise<string[]> {
    const { data } = await http.get<ApiResponse<string[]>>('/prodi/nilai-perkelas/kelas-options');
    return data.data;
  },
  async detail(jadwalKuliahId: number | string): Promise<NilaiPerkelasDetail> {
    const { data } = await http.get<ApiResponse<NilaiPerkelasDetail>>(`/prodi/nilai-perkelas/${jadwalKuliahId}`);
    return data.data;
  },
};
