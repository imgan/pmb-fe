import { http } from './http';
import { dosenHttp } from './dosenHttp';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';

export type KomponenObe = 'partisipatif' | 'tugas' | 'quiz' | 'proyek' | 'uts' | 'uas';

/** Komponen nilai yang dibobot (urutan tampil). */
export const KOMPONEN_OBE: { key: KomponenObe; label: string }[] = [
  { key: 'partisipatif', label: 'Partisipasi' },
  { key: 'tugas', label: 'Tugas' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'proyek', label: 'Proyek' },
  { key: 'uts', label: 'UTS' },
  { key: 'uas', label: 'UAS' },
];

/** Jenis Evaluasi = komponen nilai yang diisi dosen. */
export const JENIS_EVALUASI: { value: KomponenObe; label: string }[] = [
  { value: 'partisipatif', label: 'Aktivitas Partisipatif' },
  { value: 'proyek', label: 'Hasil Proyek' },
  { value: 'tugas', label: 'Kognitif/Pengetahuan - Tugas' },
  { value: 'quiz', label: 'Kognitif/Pengetahuan - Quiz' },
  { value: 'uts', label: 'Kognitif/Pengetahuan - Ujian Tengah Semester' },
  { value: 'uas', label: 'Kognitif/Pengetahuan - Ujian Akhir Semester' },
];

/** Metode Evaluasi beserta jenis yang otomatis terpilih. */
export const METODE_EVALUASI: { value: string; jenis: KomponenObe }[] = [
  { value: 'Aktivitas Partisipatif', jenis: 'partisipatif' },
  { value: 'Tugas Individu', jenis: 'tugas' },
  { value: 'Tugas Kelompok', jenis: 'tugas' },
  { value: 'Presentasi', jenis: 'tugas' },
  { value: 'Studi Kasus', jenis: 'tugas' },
  { value: 'Praktikum', jenis: 'tugas' },
  { value: 'Quiz', jenis: 'quiz' },
  { value: 'Proyek', jenis: 'proyek' },
  { value: 'UTS', jenis: 'uts' },
  { value: 'UAS', jenis: 'uas' },
];

export interface KomponenEvaluasi {
  metode: string;
  jenis: KomponenObe;
  bobot: number;
  syaratLulus: boolean;
  /** Opsional (Komposisi Nilai Kelas): nilai per CPMK, { cpmkId: % nilai akhir } — metode tanpa sub. */
  cpmk?: Record<string, number> | null;
  /** Opsional: sub metode (bobot = % dari metode induk) beserta nilai CPMK-nya. */
  sub?: { nama: string; bobot: number; cpmk?: Record<string, number> | null }[] | null;
}

export interface BobotObe extends Record<KomponenObe, number> {
  id: number;
  jadwalKuliahId: number;
  total: number;
  komponenEvaluasi: KomponenEvaluasi[];
  keterangan: string | null;
  updatedAt: string;
  diubahOleh: string | null;
}

export type BobotObePayload = { komponenEvaluasi: KomponenEvaluasi[]; keterangan: string | null };

export interface BobotObeProdiRow {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  semester: number | null;
  tahunAjaran: string | null;
  dosen: string | null;
  bobot: BobotObe | null;
}

/** Ringkasan rumus, mis. "Partisipasi 10% + UTS 40% + UAS 50%". */
export const rumusObe = (b: Record<KomponenObe, number>) =>
  KOMPONEN_OBE.filter(({ key }) => (b[key] ?? 0) > 0)
    .map(({ key, label }) => `${label} ${b[key]}%`)
    .join(' + ');

/** Portal dosen. */
export const dosenBobotObeApi = {
  async get(jadwalKuliahId: number): Promise<BobotObe | null> {
    const { data } = await dosenHttp.get<ApiResponse<BobotObe | null>>(`/dosen-portal/kelas/${jadwalKuliahId}/bobot-obe`);
    return data.data;
  },
  async save(jadwalKuliahId: number, payload: BobotObePayload): Promise<{ message: string; data: { bobot: BobotObe; nilaiDihitungUlang: number } }> {
    const { data } = await dosenHttp.put(`/dosen-portal/kelas/${jadwalKuliahId}/bobot-obe`, payload);
    return data;
  },
};

/** Modul prodi. */
export const prodiBobotObeApi = {
  async list(query: ListQuery & { tahunAjaranId?: number; kodeProdi?: string; status?: string }): Promise<ListResult<BobotObeProdiRow>> {
    const { data } = await http.get<ApiResponse<BobotObeProdiRow[]> & { meta: ListResult<BobotObeProdiRow>['meta'] }>('/prodi/bobot-obe', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },
  async save(jadwalKuliahId: number, payload: BobotObePayload): Promise<{ message: string }> {
    const { data } = await http.put(`/prodi/bobot-obe/${jadwalKuliahId}`, payload);
    return data;
  },
  async remove(jadwalKuliahId: number): Promise<void> {
    await http.delete(`/prodi/bobot-obe/${jadwalKuliahId}`);
  },
};
