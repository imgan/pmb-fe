import { http } from './http';
import type { ApiResponse } from '@/types/common';

export interface AkmRow {
  label: string;
  aktif: number;
  cuti: number;
  doubleDegree: number;
  kampusMerdeka: number;
  nonAktif: number;
  tanpaAkm: number;
  akmTidakSesuai: number;
  total: number;
}

export interface StatistikAkm {
  periode: string;
  tahunAjaran: string;
  kategori: { key: keyof AkmRow; label: string }[];
  jumlahAkm: number;
  angkatan: AkmRow[];
  prodi: AkmRow[];
  total: Omit<AkmRow, 'label'>;
}

/** `modul` prodi = dibatasi ke prodi sesi (header X-Kode-Prodi). */
export const statistikAkmApi = {
  async get(tahunAjaranId?: number, modul: 'baak' | 'prodi' = 'baak'): Promise<StatistikAkm> {
    const { data } = await http.get<ApiResponse<StatistikAkm>>(`/${modul}/statistik-akm`, { params: { tahunAjaranId } });
    return data.data;
  },
  async exportExcel(tahunAjaranId?: number, modul: 'baak' | 'prodi' = 'baak'): Promise<Blob> {
    const { data } = await http.get(`/${modul}/statistik-akm/export`, { params: { tahunAjaranId }, responseType: 'blob' });
    return data;
  },
};
