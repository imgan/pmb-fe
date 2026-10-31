import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse } from '@/types/common';

export interface AngketPelayananPertanyaan {
  id: number;
  kategori: string | null;
  pertanyaan: string;
  urutan: number;
}

export interface AngketPelayananStatus {
  tahunAjaranId: number;
  sudahDiisi: boolean;
  /** Kosong bila sudah diisi. */
  pertanyaan: AngketPelayananPertanyaan[];
}

export interface SubmitAngketPelayananPayload {
  tahunAjaranId: number;
  jawaban: { pertanyaanId: number; skor: number }[];
  saran?: string | null;
}

/** Angket pelayanan (kepuasan layanan institusi) — wajib diisi per tahun ajaran sebelum mengisi KRS. */
export const mahasiswaAngketPelayananApi = {
  async status(tahunAjaranId: number): Promise<AngketPelayananStatus> {
    const { data } = await mahasiswaHttp.get<ApiResponse<AngketPelayananStatus>>('/mahasiswa-portal/angket-pelayanan', {
      params: { tahunAjaranId },
    });
    return data.data;
  },
  async submit(payload: SubmitAngketPelayananPayload): Promise<void> {
    await mahasiswaHttp.post('/mahasiswa-portal/angket-pelayanan', payload);
  },
};
