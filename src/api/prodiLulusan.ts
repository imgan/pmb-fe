import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { LulusanItem } from '@/types/entities';

export const prodiLulusanApi = {
  async list(query?: ListQuery): Promise<ListResult<LulusanItem>> {
    const { data } = await http.get<ApiResponse<LulusanItem[]> & { meta: ListResult<LulusanItem>['meta'] }>(
      '/prodi/lulusan',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },

  async tahunLulusOptions(): Promise<number[]> {
    const { data } = await http.get<ApiResponse<number[]>>('/prodi/lulusan/tahun-lulus-options');
    return data.data;
  },
};
