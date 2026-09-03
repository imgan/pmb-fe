import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
import type { PembayaranWisuda } from '@/types/entities';

export interface PembayaranWisudaPayload {
  nim: string;
  tanggalBayar: string;
  noBukti: string;
  semester?: number | null;
  periode: string;
  bayar: number;
  kodeBank?: string | null;
}

export interface PembayaranWisudaListQuery extends ListQuery {
  mahasiswaId?: number | string;
}

interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: PagingMeta;
}

export const pembayaranWisudaApi = {
  async list(query: PembayaranWisudaListQuery = {}): Promise<ListResult<PembayaranWisuda>> {
    const { data } = await http.get<ApiListResponse<PembayaranWisuda>>('/keuangan/pembayaran-wisuda', { params: query });
    return { data: data.data, meta: data.meta };
  },
  async create(payload: PembayaranWisudaPayload): Promise<PembayaranWisuda> {
    const { data } = await http.post<ApiResponse<PembayaranWisuda>>('/keuangan/pembayaran-wisuda', payload);
    return data.data;
  },
  async remove(id: number | string): Promise<void> {
    await http.delete(`/keuangan/pembayaran-wisuda/${id}`);
  },
};
