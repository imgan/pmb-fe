import { http } from './http';
import type { ApiResponse } from '@/types/common';

/** Alur cekal per prodi: minimal persen tagihan yang sudah dibayar (0–100) per jenis. */
export interface BatasTagihanAkademik {
  jurusanId: number;
  namaJurusan: string;
  golonganKelas: string | null;
  krsAktif: boolean;
  minBayarKrs: number;
  utsAktif: boolean;
  minBayarUts: number;
  nilaiAktif: boolean;
  minBayarNilai: number;
  updatedAt: string | null;
}

export type BatasTagihanAkademikPayload = Pick<
  BatasTagihanAkademik,
  'krsAktif' | 'minBayarKrs' | 'utsAktif' | 'minBayarUts' | 'nilaiAktif' | 'minBayarNilai'
>;

export type JenisCekal = 'krs' | 'uts' | 'nilai';

export interface StatusCekalMahasiswa {
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  angkatan: number | null;
  tagihanSemester: number;
  dibayarSemester: number;
  tunggakanLain: number;
  /** null = belum ada tagihan semester berjalan. */
  persenDibayar: number | null;
  krs: boolean;
  uts: boolean;
  nilai: boolean;
}

export const batasTagihanAkademikApi = {
  async list(): Promise<BatasTagihanAkademik[]> {
    const { data } = await http.get<ApiResponse<BatasTagihanAkademik[]>>('/keuangan/batas-tagihan-akademik');
    return data.data;
  },
  async update(jurusanId: number, payload: BatasTagihanAkademikPayload): Promise<BatasTagihanAkademik> {
    const { data } = await http.put<ApiResponse<BatasTagihanAkademik>>(`/keuangan/batas-tagihan-akademik/${jurusanId}`, payload);
    return data.data;
  },
  async statusMahasiswa(query: { jurusanId: number; jenis?: JenisCekal; status?: 'cekal' | 'boleh'; search?: string }): Promise<StatusCekalMahasiswa[]> {
    const { data } = await http.get<ApiResponse<StatusCekalMahasiswa[]>>('/keuangan/batas-tagihan-akademik/status-mahasiswa', {
      params: query,
    });
    return data.data;
  },
};
