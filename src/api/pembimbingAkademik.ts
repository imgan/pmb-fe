import { createCrudApi } from './crudFactory';
import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { PembimbingAkademik } from '@/types/entities';

export interface PembimbingAkademikPayload {
  dosenId: number;
  noSk?: string | null;
  tanggalSk?: string | null;
}

export interface MahasiswaBimbinganRow {
  id: number;
  nim: string;
  namaLengkap: string;
  angkatan: number | null;
  prodi: string | null;
  pembimbingAkademikId: number | null;
  /** Nama dosen PA saat ini (bisa PA lain). */
  pembimbing: string | null;
}

const baseApi = createCrudApi<PembimbingAkademik, PembimbingAkademikPayload, Partial<PembimbingAkademikPayload>>(
  'prodi/pembimbing-akademik'
);

export const pembimbingAkademikApi = {
  ...baseApi,
  async listMahasiswa(
    id: number,
    query: { status?: 'bimbingan' | 'belum' | 'semua'; angkatan?: number; search?: string } = {}
  ): Promise<MahasiswaBimbinganRow[]> {
    const { data } = await http.get<ApiResponse<MahasiswaBimbinganRow[]>>(`/prodi/pembimbing-akademik/${id}/mahasiswa`, { params: query });
    return data.data;
  },
  async setMahasiswa(id: number, payload: { tambah?: number[]; hapus?: number[] }): Promise<{ ditetapkan: number; dilepas: number }> {
    const { data } = await http.put<ApiResponse<{ ditetapkan: number; dilepas: number }>>(`/prodi/pembimbing-akademik/${id}/mahasiswa`, payload);
    return data.data;
  },
};
