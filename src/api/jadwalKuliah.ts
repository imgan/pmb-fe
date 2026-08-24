import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { HariKuliah, JadwalKuliah } from '@/types/entities';

export interface JadwalKuliahPayload {
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks?: number | null;
  dosenKordinatorId: number;
  tahunAjaranId: number;
  dosenPengampuIds?: number[];
  hari?: HariKuliah[] | null;
  jam?: number | null;
  ruangan?: string | null;
  gcr?: string | null;
  isActive?: boolean;
}

const baseApi = createCrudApi<JadwalKuliah, JadwalKuliahPayload, Partial<JadwalKuliahPayload>>('jadwal-kuliah');

export const jadwalKuliahApi = {
  ...baseApi,

  async kelasOptions(): Promise<string[]> {
    const { data } = await http.get<ApiResponse<string[]>>('/jadwal-kuliah/kelas-options');
    return data.data;
  },
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/jadwal-kuliah/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/jadwal-kuliah/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/jadwal-kuliah/import-template', { responseType: 'blob' });
    return data;
  },
};
