import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { HariKuliah, JadwalKuliah } from '@/types/entities';

/** Peserta kelas (KRS) + rekap kehadiran — Master Monitoring BAAK. */
export interface PesertaKelas {
  id: number;
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  sistemKuliah: string | null;
  statusKrs: 'DRAFT' | 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';
  statusMahasiswa: string;
  waktuKuliah: string | null;
  semester: number;
  kelas: string;
  hadir: number;
  jumlahPertemuan: number;
  persen: number | null;
}

export interface JadwalKuliahPayload {
  kelas: string;
  /** Mata kuliah (dari Matakuliah Aktif); kode/nama/SKS disalin otomatis. */
  mataKuliahId?: number | null;
  kodeMataKuliah?: string;
  namaMataKuliah?: string;
  sks?: number | null;
  semester?: number | null;
  dosenKordinatorId: number;
  tahunAjaranId: number;
  /** Format lama tanpa SKS; jangan dikirim bersama `dosenPengampu`. */
  dosenPengampuIds?: number[];
  /** Dosen pengampu beserta SKS yang diberikan ke masing-masing dosen. */
  dosenPengampu?: { dosenId: number; sks: number | null }[];
  hari?: HariKuliah[] | null;
  jam?: number | null;
  ruangan?: string | null;
  gcr?: string | null;
  isActive?: boolean;
}

/** Mata kuliah dari menu Matakuliah Aktif yang bisa dipilih untuk jadwal pada tahun akademik tsb. */
export interface MatakuliahAktifOption {
  /** Id aktivasi (baris matakuliah_aktif) — satu MK bisa aktif di beberapa semester. */
  id: number;
  mataKuliahId: number;
  /** Aktif Semester = semester jadwal. */
  semester: number;
  semesterKurikulum: number | null;
  kode: string;
  mataKuliah: string;
  kurikulum: string | null;
  prodi: string | null;
  tahunKurikulum: number | null;
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksTotal: number;
}

const baseApi = createCrudApi<JadwalKuliah, JadwalKuliahPayload, Partial<JadwalKuliahPayload>>('jadwal-kuliah');

export const jadwalKuliahApi = {
  ...baseApi,

  async matakuliahOptions(tahunAjaranId: number): Promise<MatakuliahAktifOption[]> {
    const { data } = await http.get<ApiResponse<MatakuliahAktifOption[]>>('/jadwal-kuliah/matakuliah-options', {
      params: { tahunAjaranId },
    });
    return data.data;
  },

  async peserta(id: number | string): Promise<PesertaKelas[]> {
    const { data } = await http.get<ApiResponse<PesertaKelas[]>>(`/jadwal-kuliah/${id}/peserta`);
    return data.data;
  },
  /** Pilihan ruangan dari Master Ruangan (Modul Admin); value = nama ruang. */
  async ruanganOptions(): Promise<{ value: string; label: string }[]> {
    const { data } = await http.get<ApiResponse<{ value: string; label: string }[]>>('/jadwal-kuliah/ruangan-options');
    return data.data;
  },
  async kelasOptions(): Promise<string[]> {
    const { data } = await http.get<ApiResponse<string[]>>('/jadwal-kuliah/kelas-options');
    return data.data;
  },
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/jadwal-kuliah/export', { responseType: 'blob' });
    return data;
  },
  /** Format cetak prodi (V2): satu prodi + semester, satu sheet per kelas. */
  async exportExcelV2(params: { kodeProdi: string; semester: number; tahunAjaranId?: number }): Promise<Blob> {
    const { data } = await http.get('/jadwal-kuliah/export-v2', { params, responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/jadwal-kuliah/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/jadwal-kuliah/import-template', { responseType: 'blob' });
    return data;
  },
};
