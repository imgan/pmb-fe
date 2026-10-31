import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
import type { PengajuanCuti, StatusPengajuanCuti } from './mahasiswaPortal';

export interface PengajuanCutiProdi extends PengajuanCuti {
  mahasiswa: { id: number; nim: string; namaLengkap: string; prodi: string };
  verifikator: string | null;
  diverifikasiAt: string | null;
}

export interface VerifikasiCutiPayload {
  status: Exclude<StatusPengajuanCuti, 'DIAJUKAN'>;
  catatanProdi?: string | null;
}

/** Pengajuan cuti dari portal mahasiswa — diverifikasi prodi di menu Master Cuti. */
export const pengajuanCutiApi = {
  async list(query: ListQuery = {}): Promise<ListResult<PengajuanCutiProdi>> {
    const { data } = await http.get<ApiResponse<PengajuanCutiProdi[]> & { meta: PagingMeta }>('/prodi/pengajuan-cuti', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },
  async verifikasi(id: number, payload: VerifikasiCutiPayload): Promise<PengajuanCuti> {
    const { data } = await http.put<ApiResponse<PengajuanCuti>>(`/prodi/pengajuan-cuti/${id}/verifikasi`, payload);
    return data.data;
  },
  async cetakPdf(id: number): Promise<Blob> {
    const { data } = await http.get(`/prodi/pengajuan-cuti/${id}/pdf`, { responseType: 'blob' });
    return data;
  },
};
