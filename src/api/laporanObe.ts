import { http } from './http';
import type { ApiResponse } from '@/types/common';

/** Prodi → Laporan → Laporan OBE (Monitoring OBE): capaian CPL/CPMK dari Input Nilai OBE. */
export type JenisLaporanObe = 'cpl-prodi' | 'cpl-mahasiswa' | 'cpmk-mk' | 'cpmk-mahasiswa';
export type MetodeLaporanObe = 'rerata' | 'progresif';

export interface LaporanObeQuery {
  jenis: JenisLaporanObe;
  tahunKurikulum: number;
  kodeProdi: string;
  angkatan?: number;
  metode: MetodeLaporanObe;
  /** Wajib untuk CPMK per Mahasiswa. */
  mataKuliahId?: number;
}

export interface LaporanObeMkOption {
  id: number;
  kode: string;
  mataKuliah: string;
  semester: number | null;
  sks: number;
  isObe: boolean;
  jumlahCpmk: number;
}

export type StatusCpmkMahasiswa = 'SUDAH' | 'BELUM' | 'BELUM_DINILAI' | 'TANPA_TARGET';

export interface LaporanObeOptions {
  prodi: { kodeProdi: string; nama: string; tahunKurikulum: number[]; angkatan: number[] }[];
}

export interface StatistikCapaian {
  jumlahMahasiswa: number;
  rerata: number | null;
  min: number | null;
  max: number | null;
  target: number | null;
  /** null = belum ada nilai atau target belum diisi. */
  tercapai: boolean | null;
}

export interface KonteksLaporanObe {
  jenis: JenisLaporanObe;
  metode: MetodeLaporanObe;
  prodi: string;
  kodeProdi: string;
  tahunKurikulum: number;
  angkatan: number | null;
  jumlahMahasiswa: number;
  /** CPL per Mahasiswa: jumlah yang sudah punya nilai OBE (jumlahMahasiswa = semua yang mengambil MK kurikulum). */
  jumlahDinilai?: number;
}

export type LaporanObeData =
  | { konteks: KonteksLaporanObe & { jenis: 'cpl-prodi' }; rows: (StatistikCapaian & { id: number; kode: string; aspek: string | null; deskripsi: string; jumlahCpmk: number; mhsBelum: number | null; mhsSudah: number | null })[] }
  | {
      konteks: KonteksLaporanObe & { jenis: 'cpl-mahasiswa' };
      kolom: { id: number; kode: string; deskripsi: string; target: number | null }[];
      rows: { id: number; nim: string; nama: string; angkatan: number; nilai: Record<string, number | null> }[];
      rerata: Record<string, number | null>;
    }
  | {
      konteks: KonteksLaporanObe & { jenis: 'cpmk-mahasiswa'; jumlahDinilai?: number };
      mataKuliah: { id: number; kode: string; mataKuliah: string; sks: number; semester: number | null; isObe: boolean; targetCpmk: number | null };
      kolom: { id: number; kode: string; deskripsi: string }[];
      rows: { id: number; nim: string; nama: string; angkatan: number; nilai: Record<string, number | null>; status: StatusCpmkMahasiswa }[];
      rerata: Record<string, number | null>;
    }
  | {
      konteks: KonteksLaporanObe & { jenis: 'cpmk-mk' };
      rows: {
        id: number;
        kode: string;
        mataKuliah: string;
        semester: number | null;
        isObe: boolean;
        cpmk: (StatistikCapaian & { id: number; kode: string; deskripsi: string; cpl: string[] })[];
      }[];
    };

export const laporanObeApi = {
  async filterOptions(): Promise<LaporanObeOptions> {
    const { data } = await http.get<ApiResponse<LaporanObeOptions>>('/prodi/laporan-obe/filter-options');
    return data.data;
  },
  async mataKuliah(kodeProdi: string, tahunKurikulum: number): Promise<LaporanObeMkOption[]> {
    const { data } = await http.get<ApiResponse<LaporanObeMkOption[]>>('/prodi/laporan-obe/mata-kuliah', { params: { kodeProdi, tahunKurikulum } });
    return data.data;
  },
  async generate(query: LaporanObeQuery): Promise<LaporanObeData> {
    const { data } = await http.get<ApiResponse<LaporanObeData>>('/prodi/laporan-obe', { params: query });
    return data.data;
  },
  async pdf(query: LaporanObeQuery & { kop: boolean }): Promise<Blob> {
    const { data } = await http.get('/prodi/laporan-obe/pdf', { params: { ...query, kop: query.kop ? 1 : 0 }, responseType: 'blob' });
    return data;
  },
};
