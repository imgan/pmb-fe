import { http } from './http';
import type { ApiResponse } from '@/types/common';

export interface RekapAngketPertanyaan {
  id: number;
  kategori: string | null;
  pertanyaan: string;
  aktif: boolean;
  jumlahJawaban: number;
  rataRata: number | null;
  /** Jumlah jawaban per skor 1–5. */
  distribusi: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface RekapAngketPelayanan {
  responden: number;
  totalMahasiswa: number;
  rataRataKeseluruhan: number | null;
  pertanyaan: RekapAngketPertanyaan[];
  saran: { id: number; saran: string; prodi: string | null; angkatan: number | null; tanggal: string }[];
}

export const angketPelayananApi = {
  /** Rekap hasil angket pelayanan (modul Prodi; dibatasi ke prodi sesi untuk akun Prodi). */
  async rekap(query: { tahunAjaranId?: number; angkatan?: number } = {}): Promise<RekapAngketPelayanan> {
    const { data } = await http.get<ApiResponse<RekapAngketPelayanan>>('/prodi/angket-pelayanan', { params: query });
    return data.data;
  },
};

export interface PertanyaanAngket {
  id: number;
  kategori: string | null;
  pertanyaan: string;
  urutan: number;
  isActive: boolean;
  /** Jumlah isian angket yang menjawab pertanyaan ini (yang > 0 tidak bisa dihapus). */
  jumlahJawaban: number;
  updatedAt: string;
}

export interface PertanyaanAngketPayload {
  kategori?: string | null;
  pertanyaan?: string;
  urutan?: number | null;
  isActive?: boolean;
}

/** Kelola pertanyaan angket pelayanan (modul Prodi; berlaku untuk semua prodi). */
export const pertanyaanAngketApi = {
  async list(query: { search?: string; kategori?: string; status?: string } = {}): Promise<{ data: PertanyaanAngket[]; kategoriList: string[] }> {
    const { data } = await http.get<ApiResponse<PertanyaanAngket[]> & { meta: { kategoriList: string[] } }>('/prodi/pertanyaan-angket', {
      params: query,
    });
    return { data: data.data, kategoriList: data.meta?.kategoriList ?? [] };
  },
  async create(payload: PertanyaanAngketPayload): Promise<PertanyaanAngket> {
    const { data } = await http.post<ApiResponse<PertanyaanAngket>>('/prodi/pertanyaan-angket', payload);
    return data.data;
  },
  async update(id: number, payload: PertanyaanAngketPayload): Promise<PertanyaanAngket> {
    const { data } = await http.put<ApiResponse<PertanyaanAngket>>(`/prodi/pertanyaan-angket/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/prodi/pertanyaan-angket/${id}`);
  },
};
