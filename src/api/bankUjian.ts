import { http } from './http';
import type { ApiResponse } from '@/types/common';

/** LMS → Kuis & Ujian → Bank Ujian: paket soal PG + essay, dipakai tes seleksi PMB. */
export type TipeSoalUjian = 'PG' | 'ESSAY';

export interface SoalUjian {
  id?: number | null;
  tipe: TipeSoalUjian;
  pertanyaan: string;
  /** PG: teks pilihan A–F. */
  pilihan?: string[];
  /** PG: index pilihan yang benar. */
  jawabanBenar?: number | null;
  bobot: number;
}

export interface BankUjianRingkas {
  id: number;
  judul: string;
  deskripsi: string | null;
  /** null = tanpa batas waktu. */
  durasiMenit: number | null;
  acakSoal: boolean;
  updatedAt: string;
  jumlahSoal: number;
  jumlahPg: number;
  jumlahEssay: number;
  totalBobot: number;
  dipakaiTes: { id: number; namaUjian: string; tanggal: string }[];
}

export interface BankUjianDetail extends Omit<BankUjianRingkas, 'updatedAt' | 'dipakaiTes'> {
  /** Peserta yang sudah mulai mengerjakan; mengubah soal menghitung ulang nilai mereka. */
  jumlahMengerjakan: number;
  soal: SoalUjian[];
}

export interface BankUjianPayload {
  judul?: string;
  deskripsi?: string | null;
  durasiMenit?: number | null;
  acakSoal?: boolean;
  soal?: SoalUjian[];
}

export interface OpsiBankUjian {
  id: number;
  judul: string;
  jumlahPg: number;
  jumlahEssay: number;
  durasiMenit: number | null;
}

export const bankUjianApi = {
  async list(search = ''): Promise<BankUjianRingkas[]> {
    const { data } = await http.get<ApiResponse<BankUjianRingkas[]>>('/bank-ujian', { params: { search: search || undefined } });
    return data.data;
  },
  async opsi(): Promise<OpsiBankUjian[]> {
    const { data } = await http.get<ApiResponse<OpsiBankUjian[]>>('/bank-ujian/opsi');
    return data.data;
  },
  async get(id: number): Promise<BankUjianDetail> {
    const { data } = await http.get<ApiResponse<BankUjianDetail>>(`/bank-ujian/${id}`);
    return data.data;
  },
  async create(payload: BankUjianPayload): Promise<BankUjianDetail> {
    const { data } = await http.post<ApiResponse<BankUjianDetail>>('/bank-ujian', payload);
    return data.data;
  },
  async update(id: number, payload: BankUjianPayload): Promise<BankUjianDetail> {
    const { data } = await http.put<ApiResponse<BankUjianDetail>>(`/bank-ujian/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/bank-ujian/${id}`);
  },
};
