import { http } from './http';
import type { ApiResponse } from '@/types/common';

export interface AngketDosenPertanyaan {
  id: number;
  tahunAjaranId: number;
  jenjangPendidikan: string;
  kategori: string | null;
  pertanyaan: string;
  /** Jawaban isian bebas (bukan skala). */
  openQuestion: boolean;
  urutan: number;
}

export interface AngketDosenPertanyaanPayload {
  tahunAjaranId?: number;
  jenjangPendidikan?: string;
  kategori?: string | null;
  pertanyaan?: string;
  openQuestion?: boolean;
  urutan?: number | null;
}

/** Pilihan jawaban (skala nilai) untuk pertanyaan yang bukan open question. */
export interface AngketDosenJawaban {
  id: number;
  jawaban: string;
  nilai: number;
}

export interface PeriodeTerisi {
  tahunAjaranId: number;
  tahunAjaran: string;
  jenjangPendidikan: string;
  jumlah: number;
}

export interface AngketDosenPertanyaanList {
  data: AngketDosenPertanyaan[];
  jenjangOptions: string[];
  kategoriOptions: string[];
  periodeTerisi: PeriodeTerisi[];
}

/** Master pertanyaan angket dosen (modul Prodi) per Periode Akademik & Tk. Pendidikan. */
export const angketDosenPertanyaanApi = {
  async list(query: { tahunAjaranId?: number; jenjang?: string; kategori?: string }): Promise<AngketDosenPertanyaanList> {
    const { data } = await http.get<ApiResponse<AngketDosenPertanyaan[]> & { meta: Omit<AngketDosenPertanyaanList, 'data'> }>(
      '/prodi/angket-dosen-pertanyaan',
      { params: query }
    );
    return { data: data.data, ...data.meta };
  },
  async salin(payload: { dariTahunAjaranId: number; dariJenjang: string; keTahunAjaranId: number; keJenjang: string; ganti: boolean }) {
    const { data } = await http.post<ApiResponse<{ disalin: number }>>('/prodi/angket-dosen-pertanyaan/salin', payload);
    return data;
  },
  async create(payload: AngketDosenPertanyaanPayload): Promise<AngketDosenPertanyaan> {
    const { data } = await http.post<ApiResponse<AngketDosenPertanyaan>>('/prodi/angket-dosen-pertanyaan', payload);
    return data.data;
  },
  async update(id: number, payload: AngketDosenPertanyaanPayload): Promise<AngketDosenPertanyaan> {
    const { data } = await http.put<ApiResponse<AngketDosenPertanyaan>>(`/prodi/angket-dosen-pertanyaan/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/prodi/angket-dosen-pertanyaan/${id}`);
  },
  async listJawaban(): Promise<AngketDosenJawaban[]> {
    const { data } = await http.get<ApiResponse<AngketDosenJawaban[]>>('/prodi/angket-dosen-pertanyaan/jawaban');
    return data.data;
  },
  async createJawaban(payload: { jawaban: string; nilai: number }): Promise<AngketDosenJawaban> {
    const { data } = await http.post<ApiResponse<AngketDosenJawaban>>('/prodi/angket-dosen-pertanyaan/jawaban', payload);
    return data.data;
  },
  async updateJawaban(id: number, payload: { jawaban?: string; nilai?: number }): Promise<AngketDosenJawaban> {
    const { data } = await http.put<ApiResponse<AngketDosenJawaban>>(`/prodi/angket-dosen-pertanyaan/jawaban/${id}`, payload);
    return data.data;
  },
  async removeJawaban(id: number): Promise<void> {
    await http.delete(`/prodi/angket-dosen-pertanyaan/jawaban/${id}`);
  },
};
