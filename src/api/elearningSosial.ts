import { dosenHttp } from './dosenHttp';
import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse } from '@/types/common';
import type { BerkasMateri } from './elearning';

// ---------------------------------------------------------------- Jelajah

/** Konten jelajah: materi / video dari kelas lain yang terbit untuk peserta kelas atau seluruh kampus. */
export interface KontenJelajah {
  id: number;
  jenis: 'MATERI' | 'VIDEO';
  judul: string;
  deskripsi: string | null;
  url: string | null;
  kategori: string | null;
  tagline: string[];
  lampiranNama: string | null;
  pertemuanKe: number | null;
  createdAt: string;
  videoUrls: string[];
  /** Thumbnail gambar pertama materi (sampul). */
  sampul: string | null;
  kelas: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; ikon: string | null; tahunAjaran: string | null };
  dosen: string | null;
  dilihat: number;
  suka: number;
  // Detail
  isi?: string | null;
  lampiran?: string | null;
  gambar?: BerkasMateri[];
  dokumen?: BerkasMateri[];
}

export interface JelajahQuery {
  cari?: string;
  jenis?: '' | 'MATERI' | 'VIDEO';
  urut?: 'terbaru' | 'populer';
  /** lain = kelas lain (default), semua = termasuk kelas sendiri. */
  asal?: 'lain' | 'semua';
  page?: number;
  limit?: number;
}

export interface JelajahHasil {
  data: KontenJelajah[];
  total: number;
  page: number;
  limit: number;
}

export interface JelajahApi {
  list(query: JelajahQuery): Promise<JelajahHasil>;
  detail(id: number): Promise<KontenJelajah>;
  berkas(id: number, berkasId: number): Promise<{ nama: string; tipe: string | null; data: string }>;
}

const jelajahApi = (http: typeof dosenHttp, dasar: string): JelajahApi => ({
  async list(query) {
    const { data } = await http.get<ApiResponse<JelajahHasil>>(dasar, { params: query });
    return data.data;
  },
  async detail(id) {
    const { data } = await http.get<ApiResponse<KontenJelajah>>(`${dasar}/${id}`);
    return data.data;
  },
  async berkas(id, berkasId) {
    const { data } = await http.get<ApiResponse<{ nama: string; tipe: string | null; data: string }>>(`${dasar}/${id}/berkas/${berkasId}`);
    return data.data;
  },
});

export const dosenJelajahApi = jelajahApi(dosenHttp, '/dosen-portal/jelajah');
export const mahasiswaJelajahApi = jelajahApi(mahasiswaHttp, '/mahasiswa-portal/jelajah');

// ---------------------------------------------------------------- Obrolan (mahasiswa & dosen)

/** M = mahasiswa, D = dosen. */
export type TipePihak = 'M' | 'D';

export interface ObrolanRingkas {
  id: number;
  /** KELAS = grup per kelas, PRIBADI = chat dua orang. */
  jenis: 'KELAS' | 'PRIBADI';
  nama: string;
  keterangan: string;
  kodeMataKuliah?: string;
  ikon?: string | null;
  lawan?: { tipe: TipePihak; id: number };
  terakhir: { isi: string; waktu: string; pengirim: string; dariDosen: boolean } | null;
  belumDibaca: number;
}

export interface LampiranPesan {
  nama: string;
  tipe: string | null;
  ukuran: number;
}

export interface PesanObrolan {
  id: number;
  isi: string;
  waktu: string;
  saya: boolean;
  pengirim: { tipe: TipePihak; nomor: string; nama: string };
  lampiran: LampiranPesan | null;
  /** true = pesan sudah ditarik pengirimnya (isi & lampiran sudah dihapus). */
  ditarik?: boolean;
}

export interface KontakObrolan {
  tipe: TipePihak;
  id: number;
  /** NIM / NIDN. */
  nomor: string;
  nama: string;
  /** Mata kuliah bersama. */
  keterangan: string;
}

export interface ObrolanApi {
  list(): Promise<{ obrolan: ObrolanRingkas[]; belumDibaca: number }>;
  belumDibaca(): Promise<number>;
  kontak(): Promise<KontakObrolan[]>;
  mulaiPribadi(lawan: { tipe: TipePihak; id: number }): Promise<number>;
  /**
   * setelah = pesan lebih baru dari id tsb (polling); sebelum = muat pesan lebih lama;
   * dari = id pesan tertua di layar → 'ditarik' berisi id pesan yang ditarik dalam rentang dari..setelah.
   */
  pesan(
    id: number,
    opsi?: { setelah?: number; sebelum?: number; dari?: number }
  ): Promise<{ pesan: PesanObrolan[]; adaLebihLama: boolean; ditarik?: number[] }>;
  /** Tarik pesan milik sendiri. */
  tarik(id: number, pesanId: number): Promise<void>;
  /** Isi lampiran (data URL). */
  lampiran(id: number, pesanId: number): Promise<{ lampiran: string; nama: string; tipe: string | null }>;
  kirim(id: number, body: { isi?: string | null; lampiran?: string | null; lampiranNama?: string | null }): Promise<number>;
}

const obrolanApiDari = (http: typeof dosenHttp, dasar: string): ObrolanApi => ({
  async list() {
    const { data } = await http.get<ApiResponse<{ obrolan: ObrolanRingkas[]; belumDibaca: number }>>(dasar);
    return data.data;
  },
  async belumDibaca() {
    const { data } = await http.get<ApiResponse<{ belumDibaca: number }>>(`${dasar}/belum-dibaca`);
    return data.data.belumDibaca;
  },
  async kontak() {
    const { data } = await http.get<ApiResponse<KontakObrolan[]>>(`${dasar}/kontak`);
    return data.data;
  },
  async mulaiPribadi(lawan) {
    const { data } = await http.post<ApiResponse<{ id: number }>>(`${dasar}/pribadi`, lawan);
    return data.data.id;
  },
  async pesan(id, opsi = {}) {
    const { data } = await http.get<ApiResponse<{ pesan: PesanObrolan[]; adaLebihLama: boolean; ditarik?: number[] }>>(`${dasar}/${id}/pesan`, { params: opsi });
    return data.data;
  },
  async lampiran(id, pesanId) {
    const { data } = await http.get<ApiResponse<{ lampiran: string; nama: string; tipe: string | null }>>(`${dasar}/${id}/pesan/${pesanId}/lampiran`);
    return data.data;
  },
  async tarik(id, pesanId) {
    await http.delete(`${dasar}/${id}/pesan/${pesanId}`);
  },
  async kirim(id, body) {
    const { data } = await http.post<ApiResponse<{ id: number }>>(`${dasar}/${id}/pesan`, body);
    return data.data.id;
  },
});

export const obrolanApi = {
  mahasiswa: obrolanApiDari(mahasiswaHttp, '/mahasiswa-portal/obrolan'),
  dosen: obrolanApiDari(dosenHttp, '/dosen-portal/obrolan'),
};
