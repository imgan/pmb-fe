import { pesertaHttp } from './pesertaHttp';
import type { ApiResponse } from '@/types/common';
import type { Peserta, PesertaBiodata, PesertaDokumenStatus } from '@/types/entities';

/** Jadwal tes ujian milik peserta yang login (diatur admin di menu Tes Ujian). */
export interface PesertaTesUjian {
  id: number;
  tesUjianId: number;
  namaUjian: string;
  gelombang: string | null;
  /** null = Semua Jurusan. */
  prodi: string | null;
  tanggal: string;
  waktu: string | null;
  lokasi: string | null;
  nilai: number | null;
  status: 'belum_ujian' | 'lulus' | 'tidak_lulus';
  /** Soal online (bank ujian LMS); null = tes tanpa soal online. */
  ujianOnline: { durasiMenit: number | null; pg: number; essay: number } | null;
  pengerjaan: 'TANPA_SOAL' | 'BELUM_MULAI' | 'MENGERJAKAN' | 'SELESAI';
  mulaiAt: string | null;
  selesaiAt: string | null;
  /** Bisa mulai (hari tes) atau melanjutkan. */
  bisaDikerjakan: boolean;
}

/** Lembar ujian online (tanpa kunci jawaban) + jawaban tersimpan. */
export interface LembarUjian {
  id: number;
  namaUjian: string;
  judul: string;
  durasiMenit: number | null;
  mulaiAt: string;
  /** null = tanpa batas waktu. */
  batasAt: string | null;
  /** Waktu server, untuk menyelaraskan hitung mundur. */
  sekarang: string;
  soal: { id: number; tipe: 'PG' | 'ESSAY'; pertanyaan: string; pilihan: string[]; bobot: number }[];
  jawaban: Record<number, { pilihan: number | null; teks: string | null }>;
}

export interface PesertaRegisterPayload {
  namaLengkap: string;
  asalSekolah: string;
  golonganKelasId: number;
  jurusanId: number;
  noTelepon: string;
  email: string;
  sumberInformasiId?: number | null;
  /** Minat jalur pendaftaran; null = Pembiayaan Mandiri. */
  beasiswaId?: number | null;
  /** Biodata lengkap dari form pendaftaran publik (langsung terkunci). */
  biodata?: PesertaBiodataPayload;
}

export type PesertaUpdateMePayload = Partial<Omit<PesertaRegisterPayload, 'biodata'>>;

export type PesertaBiodataPayload = Omit<PesertaBiodata, 'id' | 'pesertaId' | 'isLocked'>;

/** Sumber Informasi 2 (portal peserta). beasiswaId null = Pembiayaan Mandiri. */
export interface PesertaDataPmbPayload {
  golonganKelasId: number | null;
  beasiswaId: number | null;
  ukuranAlmamater: string | null;
  gelombangId: number | null;
  jurusan1Id: number | null;
  jurusan2Id: number | null;
  jurusan3Id: number | null;
}

export interface PesertaDataPmb extends PesertaDataPmbPayload {
  /** Sudah pernah disimpan peserta/admin. */
  tersimpan: boolean;
  /** Dikunci admin = hanya bisa dibaca. */
  terkunci: boolean;
  /** Isian popup Sumber Informasi (admin); kunci terpisah. */
  sumber: PesertaSumberInformasiPayload & { terkunci: boolean };
  opsi: {
    kelas: { id: number; namaKelas: string }[];
    beasiswa: { id: number; namaBeasiswa: string }[];
    gelombang: { id: number; namaGelombang: string }[];
    ukuran: { id: number; ukuran: string }[];
    jurusan: { id: number; namaJurusan: string; jenjangPendidikan: string | null; golonganKelasId: number }[];
    sumber: { id: number; namaInformasi: string }[];
  };
}

export interface PesertaSumberInformasiPayload {
  sumberInformasiId: number | null;
  keteranganSumber: string | null;
  kodeUnik: string | null;
}

export interface PesertaLoginResult {
  peserta: Peserta;
  accessToken: string;
}

export const pesertaAuthApi = {
  async register(payload: PesertaRegisterPayload): Promise<Peserta> {
    const { data } = await pesertaHttp.post<ApiResponse<Peserta>>('/peserta/register', payload);
    return data.data;
  },
  /** username = nomor HP atau email. */
  async login(username: string, password: string): Promise<PesertaLoginResult> {
    const { data } = await pesertaHttp.post<ApiResponse<PesertaLoginResult>>('/peserta/login', { username, password });
    return data.data;
  },
  async gantiPassword(passwordLama: string, passwordBaru: string): Promise<Peserta> {
    const { data } = await pesertaHttp.put<ApiResponse<Peserta>>('/peserta/me/password', { passwordLama, passwordBaru });
    return data.data;
  },
  async me(): Promise<Peserta> {
    const { data } = await pesertaHttp.get<ApiResponse<Peserta>>('/peserta/me');
    return data.data;
  },
  async forgotPassword(email: string): Promise<string> {
    const { data } = await pesertaHttp.post<ApiResponse<null>>('/peserta/forgot-password', { email });
    return data.message;
  },
  async resetPassword(token: string, password: string): Promise<string> {
    const { data } = await pesertaHttp.post<ApiResponse<null>>('/peserta/reset-password', { token, password });
    return data.message;
  },
  async updateMe(payload: PesertaUpdateMePayload): Promise<Peserta> {
    const { data } = await pesertaHttp.put<ApiResponse<Peserta>>('/peserta/me', payload);
    return data.data;
  },
  async saveBiodata(payload: PesertaBiodataPayload): Promise<Peserta> {
    const { data } = await pesertaHttp.put<ApiResponse<Peserta>>('/peserta/me/biodata', payload);
    return data.data;
  },
  async listMyDokumen(): Promise<PesertaDokumenStatus[]> {
    const { data } = await pesertaHttp.get<ApiResponse<PesertaDokumenStatus[]>>('/peserta/me/dokumen');
    return data.data;
  },
  async uploadMyDokumen(dokumenKelengkapanId: number, fileName: string, file: string): Promise<void> {
    await pesertaHttp.put(`/peserta/me/dokumen/${dokumenKelengkapanId}`, { fileName, file });
  },
  async removeMyDokumen(dokumenKelengkapanId: number): Promise<void> {
    await pesertaHttp.delete(`/peserta/me/dokumen/${dokumenKelengkapanId}`);
  },
  async listMyTesUjian(): Promise<PesertaTesUjian[]> {
    const { data } = await pesertaHttp.get<ApiResponse<PesertaTesUjian[]>>('/peserta/me/tes-ujian');
    return data.data;
  },
  /** Mulai / lanjutkan ujian online. */
  async mulaiTesUjian(id: number): Promise<LembarUjian> {
    const { data } = await pesertaHttp.post<ApiResponse<LembarUjian>>(`/peserta/me/tes-ujian/${id}/mulai`);
    return data.data;
  },
  async simpanJawabanUjian(id: number, payload: { soalId: number; pilihan?: number | null; teks?: string | null }): Promise<void> {
    await pesertaHttp.put(`/peserta/me/tes-ujian/${id}/jawaban`, payload);
  },
  async kirimTesUjian(id: number): Promise<void> {
    await pesertaHttp.post(`/peserta/me/tes-ujian/${id}/kirim`);
  },
  async getMyDataPmb(): Promise<PesertaDataPmb> {
    const { data } = await pesertaHttp.get<ApiResponse<PesertaDataPmb>>('/peserta/me/data-pmb');
    return data.data;
  },
  async saveMySumberInformasi(payload: PesertaSumberInformasiPayload): Promise<PesertaDataPmb> {
    const { data } = await pesertaHttp.put<ApiResponse<PesertaDataPmb>>('/peserta/me/sumber-informasi', payload);
    return data.data;
  },
  async saveMyDataPmb(payload: PesertaDataPmbPayload): Promise<PesertaDataPmb> {
    const { data } = await pesertaHttp.put<ApiResponse<PesertaDataPmb>>('/peserta/me/data-pmb', payload);
    return data.data;
  },
};
