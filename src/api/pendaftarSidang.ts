import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { PendaftarSidang } from '@/types/entities';

export interface PendaftarSidangPayload {
  mahasiswaId: number;
  jadwalSidangId?: number | null;
  judul: string;
  pembimbing1Id?: number | null;
  pembimbing2Id?: number | null;
}

export interface PendaftarSidangFilterOptions {
  tanggal: string[];
  ruangan: string[];
}

export const pendaftarSidangApi = {
  ...createCrudApi<PendaftarSidang, PendaftarSidangPayload, Partial<PendaftarSidangPayload>>('prodi/pendaftar-sidang'),
  async filterOptions(): Promise<PendaftarSidangFilterOptions> {
    const { data } = await http.get<ApiResponse<PendaftarSidangFilterOptions>>('/prodi/pendaftar-sidang/filter-options');
    return data.data;
  },
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/prodi/pendaftar-sidang/export', { responseType: 'blob' });
    return data;
  },
};
