import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { VocUjianFtidItem } from '@/types/entities';

export const vocUjianFtidApi = {
  async list(query?: ListQuery): Promise<ListResult<VocUjianFtidItem>> {
    const { data } = await http.get<ApiResponse<VocUjianFtidItem[]> & { meta: ListResult<VocUjianFtidItem>['meta'] }>(
      '/prodi/voc-ujian-ftid',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },

  async bayar(dosenId: number, nominal: number): Promise<void> {
    await http.put(`/prodi/voc-ujian-ftid/${dosenId}/bayar`, { nominal });
  },
};
