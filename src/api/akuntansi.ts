import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { Akun, BukuBesarData, NeracaData } from '@/types/entities';

export const akuntansiApi = {
  async listAkun(): Promise<Akun[]> {
    const { data } = await http.get<ApiResponse<Akun[]>>('/keuangan/akuntansi/akun');
    return data.data;
  },
  async bukuBesar(params: { akunId: number; startDate?: string; endDate?: string }): Promise<BukuBesarData> {
    const { data } = await http.get<ApiResponse<BukuBesarData>>('/keuangan/akuntansi/buku-besar', { params });
    return data.data;
  },
  async neraca(params: { tanggal?: string } = {}): Promise<NeracaData> {
    const { data } = await http.get<ApiResponse<NeracaData>>('/keuangan/akuntansi/neraca', { params });
    return data.data;
  },
};
