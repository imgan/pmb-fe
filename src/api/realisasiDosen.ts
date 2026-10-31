import { http } from './http';
import type { ApiResponse } from '@/types/common';

export interface RealisasiDosenRow {
  id: number;
  tahunAjaran: string | null;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  hari: string;
  jam: number | null;
  ruangan: string | null;
  dosen: string | null;
  hadir: number;
  tidakHadir: number;
  izin: number;
  sakit: number;
  target: number;
  persentase: number;
  terakhir: string | null;
}

export interface RealisasiDosenSummary {
  jadwal: number;
  hadir: number;
  tidakHadir: number;
  target: number;
}

export interface RealisasiDosenPertemuan {
  id: number;
  pertemuanKe: number | null;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  status: 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT';
  dosen: string | null;
  uraian: string | null;
  keterangan: string | null;
}

export interface RealisasiDosenDetail {
  jadwal: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; dosen: string | null };
  pertemuan: RealisasiDosenPertemuan[];
}

export interface RealisasiDosenFilterOptions {
  tahunAjaran: { id: number; nama: string }[];
  kelas: string[];
  dosen: { id: number; nama: string }[];
}

export interface RealisasiDosenQuery {
  tahunAjaranId?: number;
  kelas?: string;
  dosenId?: number;
}

export const realisasiDosenApi = {
  async list(query: RealisasiDosenQuery = {}): Promise<{ rows: RealisasiDosenRow[]; summary: RealisasiDosenSummary }> {
    const { data } = await http.get<ApiResponse<{ rows: RealisasiDosenRow[]; summary: RealisasiDosenSummary }>>(
      '/prodi/realisasi-dosen',
      { params: query }
    );
    return data.data;
  },
  async detail(id: number): Promise<RealisasiDosenDetail> {
    const { data } = await http.get<ApiResponse<RealisasiDosenDetail>>(`/prodi/realisasi-dosen/${id}`);
    return data.data;
  },
  async filterOptions(): Promise<RealisasiDosenFilterOptions> {
    const { data } = await http.get<ApiResponse<RealisasiDosenFilterOptions>>('/prodi/realisasi-dosen/filter-options');
    return data.data;
  },
};
