import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { KonversiKurikulumList, KurikulumOption } from '@/types/entities';

/** Konversi: mata kuliah kurikulum lama (dari) → padanannya di kurikulum baru (ke). */
export const konversiKurikulumApi = {
  async filterOptions(): Promise<KurikulumOption[]> {
    const { data } = await http.get<ApiResponse<KurikulumOption[]>>('/prodi/konversi-kurikulum/filter-options');
    return data.data;
  },

  async list(params: { dariKurikulumId: number; keKurikulumId?: number }): Promise<KonversiKurikulumList> {
    const { data } = await http.get<ApiResponse<KonversiKurikulumList>>('/prodi/konversi-kurikulum', { params });
    return data.data;
  },

  async save(dariMataKuliahId: number, keMataKuliahId: number | null): Promise<void> {
    await http.post('/prodi/konversi-kurikulum', { dariMataKuliahId, keMataKuliahId });
  },
};
