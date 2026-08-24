import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { KonversiKurikulumList, KurikulumIdentifier } from '@/types/entities';

export const konversiKurikulumApi = {
  async filterOptions(): Promise<KurikulumIdentifier[]> {
    const { data } = await http.get<ApiResponse<KurikulumIdentifier[]>>('/prodi/konversi-kurikulum/filter-options');
    return data.data;
  },

  async list(params: {
    dariJurusanId: number;
    dariTahunAjaranId: number;
    keJurusanId?: number;
    keTahunAjaranId?: number;
  }): Promise<KonversiKurikulumList> {
    const { data } = await http.get<ApiResponse<KonversiKurikulumList>>('/prodi/konversi-kurikulum', { params });
    return data.data;
  },

  async save(dariKurikulumId: number, keKurikulumId: number | null): Promise<void> {
    await http.post('/prodi/konversi-kurikulum', { dariKurikulumId, keKurikulumId });
  },
};
