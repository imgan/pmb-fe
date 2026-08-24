import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { MahasiswaPerkelasFilterOptions } from '@/types/entities';

export interface MahasiswaPerkelasQuery {
  jurusanId?: number | string;
  kelas?: string;
  waktuKuliah?: string;
  tahunMasuk?: number | string;
}

export const laporanMahasiswaPerkelasApi = {
  async filterOptions(): Promise<MahasiswaPerkelasFilterOptions> {
    const { data } = await http.get<ApiResponse<MahasiswaPerkelasFilterOptions>>(
      '/laporan/cetak-mahasiswa-perkelas/filter-options'
    );
    return data.data;
  },

  async exportExcel(query: MahasiswaPerkelasQuery): Promise<Blob> {
    const { data } = await http.get('/laporan/cetak-mahasiswa-perkelas/export', {
      params: query,
      responseType: 'blob',
    });
    return data;
  },
};
