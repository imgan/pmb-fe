import { http } from './http';
import type { ApiResponse } from '@/types/common';

export interface GrafikBandingRow {
  key: string;
  label: string;
  values: number[];
  total: number;
}

export interface GrafikBanding {
  tahun: number;
  bulan: string[];
  rows: GrafikBandingRow[];
}

export interface GrafikPenerimaanRow {
  prodi: string;
  statusKelas: string;
  statusDikti: string | null;
  statusPembayaran: string | null;
  catatan: string | null;
  total: number;
}

export interface GrafikDaftarUlangRow {
  prodi: string;
  values: Record<string, number>;
  total: number;
}

export interface GrafikDaftarUlang {
  tahun: number[];
  rows: GrafikDaftarUlangRow[];
}

export const pmbGrafikApi = {
  async banding(tahun: number): Promise<GrafikBanding> {
    const { data } = await http.get<ApiResponse<GrafikBanding>>('/pmb-grafik/banding', { params: { tahun } });
    return data.data;
  },
  async tahunOptions(): Promise<number[]> {
    const { data } = await http.get<ApiResponse<number[]>>('/pmb-grafik/tahun-options');
    return data.data;
  },
  async penerimaan(tahunMasuk?: number): Promise<GrafikPenerimaanRow[]> {
    const { data } = await http.get<ApiResponse<GrafikPenerimaanRow[]>>('/pmb-grafik/penerimaan', {
      params: { tahunMasuk },
    });
    return data.data;
  },
  async penerimaanTahunOptions(): Promise<number[]> {
    const { data } = await http.get<ApiResponse<number[]>>('/pmb-grafik/penerimaan/tahun-options');
    return data.data;
  },
  async daftarUlang(): Promise<GrafikDaftarUlang> {
    const { data } = await http.get<ApiResponse<GrafikDaftarUlang>>('/pmb-grafik/daftar-ulang');
    return data.data;
  },
};
