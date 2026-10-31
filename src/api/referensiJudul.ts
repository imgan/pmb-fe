import { dosenHttp } from './dosenHttp';
import type { ApiResponse } from '@/types/common';

/** Judul dari Pengajuan TA mahasiswa (disetujui prodi) atau Yudisium. */
export interface ReferensiJudul {
  id: string;
  sumber: 'pengajuan' | 'yudisium';
  jurusanId: number | null;
  tahunAjaranId: number | null;
  nim: string;
  nama: string;
  judul: string;
  jurusan?: { id: number; namaJurusan: string } | null;
  tahunAjaran?: { id: number; nama: string; jenisSemester: string | null; label: string } | null;
}

/** Portal dosen: lihat referensi judul (filter prodi & periode). */
export const dosenReferensiJudulApi = {
  async filter(): Promise<{ prodi: { value: number; label: string }[]; periode: { value: number; label: string }[] }> {
    const { data } = await dosenHttp.get<ApiResponse<{ prodi: { value: number; label: string }[]; periode: { value: number; label: string }[] }>>(
      '/dosen-portal/referensi-judul/filter'
    );
    return data.data;
  },
  async list(params: { jurusanId?: number | null; tahunAjaranId?: number | null }): Promise<ReferensiJudul[]> {
    const { data } = await dosenHttp.get<ApiResponse<ReferensiJudul[]>>('/dosen-portal/referensi-judul', {
      params: {
        ...(params.jurusanId ? { jurusanId: params.jurusanId } : {}),
        ...(params.tahunAjaranId ? { tahunAjaranId: params.tahunAjaranId } : {}),
      },
    });
    return data.data;
  },
};
