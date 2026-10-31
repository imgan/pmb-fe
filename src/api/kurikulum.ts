import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { Kurikulum, KurikulumOption } from '@/types/entities';

/** Kurikulum (header): prodi + tahun kurikulum; mata kuliahnya lewat mataKuliahApi (kurikulumId). */
export interface KurikulumPayload {
  jurusanId: number;
  tahunKurikulum: number;
  nama?: string | null;
  tanggalMulaiEfektif?: string | null;
  tanggalAkhirEfektif?: string | null;
  keterangan?: string | null;
  isActive?: boolean;
}

const baseKurikulumApi = createCrudApi<Kurikulum, KurikulumPayload, Partial<KurikulumPayload>>('prodi/kurikulum');

export const kurikulumApi = {
  ...baseKurikulumApi,
  async options(params: { jurusanId?: number | number[] } = {}): Promise<KurikulumOption[]> {
    const { data } = await http.get<ApiResponse<KurikulumOption[]>>('/prodi/kurikulum/options', { params });
    return data.data;
  },
  async tahunOptions(): Promise<number[]> {
    const { data } = await http.get<ApiResponse<number[]>>('/prodi/kurikulum/tahun-options');
    return data.data;
  },
};

export interface MatakuliahAktifRow {
  /** Id mata kuliah. */
  id: number;
  kode: string;
  mataKuliah: string;
  kurikulumId: number;
  kurikulum: string | null;
  jurusanId: number | null;
  prodi: string | null;
  tahunKurikulum: number | null;
  semester: number | null;
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksSimulasi: number;
  sksTotal: number;
  /** Semester-semester tempat MK ini aktif pada tahun akademik terpilih. */
  aktifSemesters: number[];
  aktif: boolean;
  jumlahJadwal: number;
}

export interface MatakuliahAktifQuery {
  tahunAjaranId: number;
  aktifSemester?: number;
  kurikulumId?: number;
  jurusanId?: number;
  tahunKurikulum?: number;
  semester?: number;
  status?: 'aktif' | 'nonaktif';
  search?: string;
}

export interface MatakuliahAktifResult {
  rows: MatakuliahAktifRow[];
  ringkasan: { tahunKurikulum: number | null; jumlah: number; semesters: number[] }[];
}

export const matakuliahAktifApi = {
  async list(query: MatakuliahAktifQuery): Promise<MatakuliahAktifResult> {
    const { data } = await http.get<ApiResponse<MatakuliahAktifResult>>('/prodi/kurikulum/matakuliah-aktif', { params: query });
    return data.data;
  },
  async set(payload: { tahunAjaranId: number; semester: number; mataKuliahIds: number[]; aktif: boolean }): Promise<{ changed: number }> {
    const { data } = await http.put<ApiResponse<{ changed: number }>>('/prodi/kurikulum/matakuliah-aktif', payload);
    return data.data;
  },
};
