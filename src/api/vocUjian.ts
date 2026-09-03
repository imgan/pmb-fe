import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
import type { DosenHonorUjian, HonorUjianPembayaran } from '@/types/entities';

interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: PagingMeta;
}

export interface HonorUjianPembayaranPayload {
  dosenId: number;
  nominal: number;
}

export const vocUjianApi = {
  async list(query: ListQuery = {}): Promise<ListResult<DosenHonorUjian>> {
    const { data } = await http.get<ApiListResponse<DosenHonorUjian>>('/keuangan/voc-ujian', { params: query });
    return { data: data.data, meta: data.meta };
  },
  async create(payload: HonorUjianPembayaranPayload): Promise<HonorUjianPembayaran> {
    const { data } = await http.post<ApiResponse<HonorUjianPembayaran>>('/keuangan/voc-ujian', payload);
    return data.data;
  },
};
