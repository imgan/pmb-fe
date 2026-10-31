import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { TahunAjaran } from '@/types/entities';

export type WaktuKode = 'P' | 'M';

export interface GenerateNimMahasiswa {
  id: number;
  nim: string;
  namaLengkap: string;
  jurusanId: number;
  jurusan: { id: number; namaJurusan: string; singkatan: string | null } | null;
  golonganKelas: { id: number; namaKelas: string } | null;
  isActive: boolean;
  kelas: string | null;
  waktuKuliah: string | null;
  /** [singkatan prodi][semester][huruf kelas][P/M], mis. TI1AP — null bila kelas/waktu/singkatan belum ada. */
  namaKelas: string | null;
  krs: { status: string; jumlahMataKuliah: number } | null;
  tagihan: { totalTagihan: number } | null;
  statusAktif: string | null;
}

export interface GenerateNimKelas {
  namaKelas: string;
  namaJurusan: string | null;
  waktuKuliah: string | null;
  jumlahMahasiswa: number;
  jumlahJadwal: number;
  jumlahKrs: number;
  jumlahTagihan: number;
  jumlahAktif: number;
}

export interface GenerateNimKelasSummary {
  tahunAjaran: TahunAjaran;
  belumAdaKelas: number;
  kelas: GenerateNimKelas[];
}

export type GenerateNimAksi = 'krs' | 'tagihan' | 'status-aktif';

export const generateNimApi = {
  async listMahasiswa(query?: ListQuery): Promise<ListResult<GenerateNimMahasiswa>> {
    const { data } = await http.get<ApiResponse<GenerateNimMahasiswa[]> & { meta: ListResult<GenerateNimMahasiswa>['meta'] }>(
      '/generate-nim/mahasiswa',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async listKelas(tahunAjaranId?: number): Promise<GenerateNimKelasSummary> {
    const { data } = await http.get<ApiResponse<GenerateNimKelasSummary>>('/generate-nim/kelas', { params: { tahunAjaranId } });
    return data.data;
  },
  async setKelas(payload: { mahasiswaIds: number[]; kelas: string; waktu: WaktuKode }): Promise<string> {
    const { data } = await http.put<ApiResponse<unknown>>('/generate-nim/kelas', payload);
    return data.message;
  },
  /** Mengembalikan pesan ringkasan dari server (jumlah dibuat/diperbarui). */
  async generate(aksi: GenerateNimAksi, payload: { tahunAjaranId: number; namaKelas: string }): Promise<string> {
    const { data } = await http.post<ApiResponse<unknown>>(`/generate-nim/${aksi}`, payload);
    return data.message;
  },
};
