import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { NilaiDERow } from '@/types/entities';

export interface NilaiDEQuery {
  prodi?: string;
  kodeMataKuliah?: string;
}

export const simNilaiDEApi = {
  async list(query: NilaiDEQuery = {}): Promise<NilaiDERow[]> {
    const { data } = await http.get<ApiResponse<NilaiDERow[]>>('/sim/nilai-d-e', { params: query });
    return data.data;
  },
};
