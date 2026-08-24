import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { BiodataMahasiswaItem } from '@/types/entities';

export const biodataMahasiswaApi = {
  async list(query?: ListQuery): Promise<ListResult<BiodataMahasiswaItem>> {
    const { data } = await http.get<ApiResponse<BiodataMahasiswaItem[]> & { meta: ListResult<BiodataMahasiswaItem>['meta'] }>(
      '/prodi/biodata-mahasiswa',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
};
