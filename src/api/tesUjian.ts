import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';

export type StatusTesUjian = 'belum_ujian' | 'lulus' | 'tidak_lulus';

export interface TesUjian {
  id: number;
  namaUjian: string;
  gelombangId: number;
  gelombang?: { id: number; namaGelombang: string; tahunPmbId: number | null } | null;
  /** null = Semua Jurusan. */
  prodi: string | null;
  tanggal: string;
  lokasi: string | null;
  waktu: string | null;
  /** Paket soal online dari LMS Bank Ujian; null = tes tanpa soal online. */
  bankUjianId: number | null;
  bankUjian?: { id: number; judul: string; durasiMenit: number | null } | null;
  jumlahPeserta?: number;
}

export interface TesUjianPayload {
  namaUjian: string;
  gelombangId: number;
  prodi: string | null;
  tanggal: string;
  lokasi: string | null;
  waktu: string | null;
  bankUjianId: number | null;
}

export interface PesertaUjian {
  id: number;
  pesertaId: number;
  namaLengkap: string;
  email: string;
  jurusan: string;
  nilai: number | null;
  status: StatusTesUjian;
  dokumenLengkap: boolean;
  /** Pengerjaan soal online. */
  mulaiAt: string | null;
  selesaiAt: string | null;
  essayBelumDinilai: number;
}

/** Popup Koreksi: soal + jawaban peserta; skor PG otomatis, essay diisi admin. */
export interface KoreksiUjian {
  id: number;
  nilai: number | null;
  mulaiAt: string | null;
  selesaiAt: string | null;
  soal: {
    id: number;
    tipe: 'PG' | 'ESSAY';
    pertanyaan: string;
    pilihan: string[];
    jawabanBenar: number | null;
    bobot: number;
    jawabanPilihan: number | null;
    jawabanTeks: string | null;
    skor: number | null;
  }[];
}

export interface KandidatPesertaUjian {
  pesertaId: number;
  namaLengkap: string;
  email: string;
  jurusan: string;
  gelombang: string | null;
  dokumenLengkap: boolean;
}

export const tesUjianApi = {
  ...createCrudApi<TesUjian, TesUjianPayload, Partial<TesUjianPayload>>('tes-ujian'),
  async listPeserta(id: number, search = ''): Promise<PesertaUjian[]> {
    const { data } = await http.get<ApiResponse<PesertaUjian[]>>(`/tes-ujian/${id}/peserta`, { params: { search: search || undefined } });
    return data.data;
  },
  /** gelombang = true → hanya peserta di gelombang tes ini; semuaJurusan = true → abaikan jurusan tes. */
  async listKandidat(id: number, query: { search?: string; gelombang?: boolean; semuaJurusan?: boolean } = {}): Promise<KandidatPesertaUjian[]> {
    const { data } = await http.get<ApiResponse<KandidatPesertaUjian[]>>(`/tes-ujian/${id}/kandidat`, {
      params: { search: query.search || undefined, gelombang: query.gelombang || undefined, semuaJurusan: query.semuaJurusan || undefined },
    });
    return data.data;
  },
  async tambahPeserta(id: number, pesertaIds: number[]): Promise<{ ditambahkan: number }> {
    const { data } = await http.post<ApiResponse<{ ditambahkan: number }>>(`/tes-ujian/${id}/peserta`, { pesertaIds });
    return data.data;
  },
  async setNilai(id: number, pesertaUjianId: number, payload: { nilai: number | null; status: StatusTesUjian }): Promise<void> {
    await http.put(`/tes-ujian/${id}/peserta/${pesertaUjianId}`, payload);
  },
  async getKoreksi(id: number, pesertaUjianId: number): Promise<KoreksiUjian> {
    const { data } = await http.get<ApiResponse<KoreksiUjian>>(`/tes-ujian/${id}/peserta/${pesertaUjianId}/koreksi`);
    return data.data;
  },
  /** skor: { soalId: skor essay }. */
  async simpanKoreksi(id: number, pesertaUjianId: number, skor: Record<number, number | null>): Promise<{ nilai: number }> {
    const { data } = await http.put<ApiResponse<{ nilai: number }>>(`/tes-ujian/${id}/peserta/${pesertaUjianId}/koreksi`, { skor });
    return data.data;
  },
  async batalkan(id: number, pesertaUjianId: number): Promise<void> {
    await http.delete(`/tes-ujian/${id}/peserta/${pesertaUjianId}`);
  },
};
