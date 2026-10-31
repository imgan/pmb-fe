import { dosenHttp } from './dosenHttp';
import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse } from '@/types/common';

/** Lonceng notifikasi portal Dosen & Mahasiswa (chat, komentar, tugas, konten baru, nilai). */
export type TipeNotifikasi = 'CHAT' | 'KOMENTAR' | 'TUGAS' | 'KONTEN' | 'NILAI';
export interface Notifikasi {
  kunci: string;
  tipe: TipeNotifikasi;
  judul: string;
  isi: string;
  waktu: string;
  /** Path tujuan di aplikasi (router.push). */
  tautan: string;
  baru: boolean;
  jenisKonten?: string;
}
export interface DaftarNotifikasi {
  items: Notifikasi[];
  belumDibaca: number;
}

const buatApi = (http: typeof dosenHttp, prefix: string) => ({
  async daftar(): Promise<DaftarNotifikasi> {
    const { data } = await http.get<ApiResponse<DaftarNotifikasi>>(`${prefix}/notifikasi`);
    return data.data;
  },
  async baca(): Promise<DaftarNotifikasi> {
    const { data } = await http.post<ApiResponse<DaftarNotifikasi>>(`${prefix}/notifikasi/baca`);
    return data.data;
  },
});

export const notifikasiApi = {
  dosen: buatApi(dosenHttp, '/dosen-portal'),
  mahasiswa: buatApi(mahasiswaHttp, '/mahasiswa-portal'),
};
