import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { Yudisium } from '@/types/entities';

export interface YudisiumPayload {
  noSk?: string | null;
  tanggalSk?: string | null;
  tanggalYudisium?: string | null;
  pin?: string | null;
  judul?: string | null;
  pembimbing1Id?: number | null;
  pembimbing2Id?: number | null;
}

interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: ListResult<T>['meta'];
}

export const yudisiumApi = {
  async list(query?: ListQuery): Promise<ListResult<Yudisium>> {
    const { data } = await http.get<ApiListResponse<Yudisium>>('/yudisium', { params: query });
    return { data: data.data, meta: data.meta };
  },
  async get(id: number | string): Promise<Yudisium> {
    const { data } = await http.get<ApiResponse<Yudisium>>(`/yudisium/${id}`);
    return data.data;
  },
  async update(id: number | string, payload: YudisiumPayload): Promise<Yudisium> {
    const { data } = await http.put<ApiResponse<Yudisium>>(`/yudisium/${id}`, payload);
    return data.data;
  },
};
