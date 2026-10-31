import { http } from './http';
import type { ApiResponse } from '@/types/common';

/** Prodi → Kurikulum → Laporan Capaian OBE. */
export interface OpsiKurikulumLaporan {
  id: number;
  nama: string;
  tahunKurikulum: number | null;
  prodi: string | null;
  /** Angkatan (tahun masuk) mahasiswa prodi kurikulum tsb. */
  angkatan: number[];
}

export interface MahasiswaLaporan {
  id: number;
  nim: string;
  nama: string;
  angkatan: number;
}

export interface LaporanCplMataKuliah {
  kurikulum: { id: number; nama: string; tahunKurikulum: number | null };
  prodi: string | null;
  namaProdi: string | null;
  /** null = semua mahasiswa (rata-rata). */
  mahasiswa: { id: number; nim: string; nama: string } | null;
  jumlahMahasiswa: number;
  jumlahMahasiswaBernilai: number;
  angkatan: number | null;
  semester: number | null;
  semesterTerbilang: string | null;
  cpl: { id: number; kode: string; deskripsi: string }[];
  /** nilai[cplId]: angka, null (belum ada nilai) atau '-' (MK tidak dibebankan CPL tsb). */
  baris: {
    mataKuliahId: number;
    semester: number | null;
    kode: string;
    mataKuliah: string;
    sks: number;
    targetCpl: number | null;
    nilai: Record<string, number | null | '-'>;
  }[];
  ringkasan: {
    tertinggi: { kode: string; nilai: number } | null;
    terendah: { kode: string; nilai: number } | null;
    rataRata: number | null;
    perCpl: { kode: string; nilai: number }[];
  };
}

/** Transkrip OBE: laporan CPL per MK + hasil per CPL (target, rerata, status, progres) & penanda tangan. */
export interface TranskripObe extends LaporanCplMataKuliah {
  cplTranskrip: {
    id: number;
    kode: string;
    deskripsi: string;
    target: number;
    /** true = belum ada target di MK pembeban → target default. */
    targetDefault: boolean;
    rerata: number | null;
    status: 'MEMENUHI' | 'BELUM_MEMENUHI' | 'BELUM_DINILAI';
    dinilai: number;
    jumlahMk: number;
  }[];
  targetDefault: number;
  penandatangan: { namaProdi: string | null; kaprodi: { nama: string; nuptk: string | null } | null };
}

export type LaporanQuery = { kurikulumId: number; angkatan?: number | null; mahasiswaId?: number | null };

export const laporanCapaianApi = {
  async opsi(): Promise<OpsiKurikulumLaporan[]> {
    const { data } = await http.get<ApiResponse<OpsiKurikulumLaporan[]>>('/prodi/laporan-capaian/opsi');
    return data.data;
  },
  async mahasiswa(query: { kurikulumId: number; angkatan?: number | null; search?: string }): Promise<MahasiswaLaporan[]> {
    const { data } = await http.get<ApiResponse<MahasiswaLaporan[]>>('/prodi/laporan-capaian/mahasiswa', { params: query });
    return data.data;
  },
  async transkripObe(query: LaporanQuery): Promise<TranskripObe> {
    const { data } = await http.get<ApiResponse<TranskripObe>>('/prodi/laporan-capaian/transkrip-obe', { params: query });
    return data.data;
  },
  async cplPerMataKuliah(query: LaporanQuery): Promise<LaporanCplMataKuliah> {
    const { data } = await http.get<ApiResponse<LaporanCplMataKuliah>>('/prodi/laporan-capaian/cpl-mata-kuliah', { params: query });
    return data.data;
  },
};
