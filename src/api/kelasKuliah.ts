import { inject, type InjectionKey } from 'vue';
import { http } from './http';
import { dosenHttp } from './dosenHttp';
import type { ApiResponse } from '@/types/common';
import type { BobotObe, KomponenEvaluasi } from './bobotObe';

/** Prodi → Perkuliahan → Kelas Kuliah: daftar & detail kelas, Komposisi Nilai Kelas. */
export interface KelasKuliahRow {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  semester: number | null;
  tahunAjaran: string;
  prodi: string | null;
  tahunKurikulum: number | null;
  isObe: boolean;
  dosen: string | null;
  peserta: number;
  komposisiTerisi: boolean;
}

export interface KelasKuliahDetail {
  kelas: {
    id: number;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    sks: number | null;
    sksTeori: number;
    sksPraktik: number;
    sksLab: number;
    semester: number | null;
    hari: string[] | string | null;
    jam: number | null;
    ruangan: string | null;
    kapasitas: number | null;
    gcr: string | null;
    tahunAjaranId: number | null;
    periode: string;
    mataKuliahId: number | null;
    isObe: boolean;
    prodi: string | null;
    kodeProdi: string | null;
    kurikulum: number | null;
    sistemKuliah: string | null;
    peserta: number;
  };
  dosenKoordinator: { id: number; nidn: string; nama: string } | null;
  dosenPengampu: { id: number; nidn: string; nama: string; sks: number | null }[];
  peserta: { mahasiswaId: number; nim: string; nama: string; golongan: string | null; semester: number; statusKrs: string }[];
  komposisi: BobotObe | null;
  /** Kolom CPMK sesuai level Pemetaan CPMK mata kuliah. */
  kolomCpmk: { id: number; kode: string; deskripsi: string }[];
  /** Usulan komposisi dari Rencana Evaluasi RPS (periode berlaku ≤ periode kelas). */
  rps: { periode: { id: number; nama: string } | null; komponenEvaluasi: KomponenEvaluasi[]; diperbarui?: string };
}

export type StatusRealisasi = 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT';
export interface RealisasiPertemuan {
  id: number;
  pertemuanKe: number;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  status: StatusRealisasi;
  dosen: string | null;
  uraian: string | null;
  keterangan: string | null;
  presensi: { HADIR: number; IZIN: number; SAKIT: number; ALPA: number };
}
/** Jadwal Perkuliahan: pertemuan 1..N, rencana RPS vs realisasi mengajar dosen. */
export interface JadwalPerkuliahan {
  periodeRps: { id: number; nama: string } | null;
  ringkasan: { jumlahPertemuan: number; terlaksana: number; persentase: number; jumlahRealisasi: number };
  pertemuan: {
    pertemuanKe: number;
    rencana: { jenis: string; materi: string; metode: string | null; waktu: string | null; bentuk?: 'LURING' | 'DARING' | 'HYBRID' | null } | null;
    realisasi: RealisasiPertemuan[];
  }[];
}

/** Jadwal Ujian kelas (UTS & UAS) — tabel yang sama dengan menu Jadwal Ujian. */
export interface UjianKelas {
  jenisUjian: 'UTS' | 'UAS';
  status: 'ONLINE' | 'OFFLINE' | null;
  sifat: string | null;
  tanggal: string | null;
  ruangan: string | null;
  jamKe: number | null;
  pengawas: string;
  diubahOleh: string | null;
  diubahPada: string | null;
}
export interface JadwalUjianKelas {
  sifatOptions: string[];
  ujian: UjianKelas[];
}
export type SimpanUjianPayload = { jenisUjian: 'UTS' | 'UAS'; status: string | null; sifat: string | null; tanggal: string | null };

/** Presensi Kelas: matriks peserta × pertemuan. */
export type StatusPresensi = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';
export interface PresensiKelas {
  pertemuan: { id: number; pertemuanKe: number; tanggal: string }[];
  mahasiswa: {
    no: number;
    mahasiswaId: number;
    nim: string;
    namaLengkap: string;
    status: (StatusPresensi | null)[];
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    persen: number;
  }[];
  ringkasan: { jumlahPertemuan: number; jumlahMahasiswa: number; HADIR: number; IZIN: number; SAKIT: number; ALPA: number; persenHadir: number };
}

/** Rekap Kuesioner (EDOM) per dosen kelas. */
export interface RekapKuesionerKelas {
  peserta: number;
  skala: { jawaban: string; nilai: number }[];
  skalaMaks: number | null;
  dosen: {
    id: number;
    nidn: string;
    nama: string;
    peran: 'Koordinator' | 'Pengampu';
    dinilai: boolean;
    responden: number;
    rataRata: number | null;
    persen: number | null;
    pertanyaan: { pertanyaan: string; jumlah: number; rataRata: number | null; distribusi: Record<string, number> }[];
    terbuka: { pertanyaan: string; teks: string }[];
    saran: string[];
  }[];
}

export const kelasKuliahApi = {
  async jadwalUjian(id: number | string): Promise<JadwalUjianKelas> {
    const { data } = await http.get<ApiResponse<JadwalUjianKelas>>(`/prodi/kelas-kuliah/${id}/jadwal-ujian`);
    return data.data;
  },
  async simpanJadwalUjian(id: number, payload: SimpanUjianPayload): Promise<JadwalUjianKelas> {
    const { data } = await http.put<ApiResponse<JadwalUjianKelas>>(`/prodi/kelas-kuliah/${id}/jadwal-ujian`, payload);
    return data.data;
  },
  async presensi(id: number | string): Promise<PresensiKelas> {
    const { data } = await http.get<ApiResponse<PresensiKelas>>(`/prodi/kelas-kuliah/${id}/presensi`);
    return data.data;
  },
  async rekapKuesioner(id: number | string): Promise<RekapKuesionerKelas> {
    const { data } = await http.get<ApiResponse<RekapKuesionerKelas>>(`/prodi/kelas-kuliah/${id}/rekap-kuesioner`);
    return data.data;
  },
  async jadwalPerkuliahan(id: number | string): Promise<JadwalPerkuliahan> {
    const { data } = await http.get<ApiResponse<JadwalPerkuliahan>>(`/prodi/kelas-kuliah/${id}/jadwal-perkuliahan`);
    return data.data;
  },
  async list(query: { tahunAjaranId?: number; jurusanId?: number; search?: string } = {}): Promise<KelasKuliahRow[]> {
    const { data } = await http.get<ApiResponse<KelasKuliahRow[]>>('/prodi/kelas-kuliah', { params: query });
    return data.data;
  },
  async detail(id: number | string): Promise<KelasKuliahDetail> {
    const { data } = await http.get<ApiResponse<KelasKuliahDetail>>(`/prodi/kelas-kuliah/${id}`);
    return data.data;
  },
  async simpanKomposisi(id: number, komponenEvaluasi: KomponenEvaluasi[]): Promise<string> {
    const { data } = await http.put<ApiResponse<unknown>>(`/prodi/kelas-kuliah/${id}/komposisi`, { komponenEvaluasi });
    return data.message;
  },
  async hapusKomposisi(id: number) {
    await http.delete(`/prodi/kelas-kuliah/${id}/komposisi`);
  },
};

export type KelasKuliahApi = typeof kelasKuliahApi;

/**
 * Klien portal Dosen untuk halaman detail kelas yang sama (hanya kelas yang diampu; komposisi nilai lihat saja —
 * pengisian Bobot OBE / nilai lewat menu Input Nilai). Pilihan "Cari Kelas" = kelas yang diampu pada TA terpilih.
 */
export const dosenKelasKuliahApi: KelasKuliahApi = {
  async jadwalUjian(id) {
    const { data } = await dosenHttp.get<ApiResponse<JadwalUjianKelas>>(`/dosen-portal/kelas/${id}/jadwal-ujian`);
    return data.data;
  },
  // Simpan lewat endpoint menu Jadwal Ujian dosen (data yang sama), lalu muat ulang isian kelas.
  async simpanJadwalUjian(id, payload) {
    await dosenHttp.put(`/dosen-portal/jadwal-ujian/${id}`, payload);
    return dosenKelasKuliahApi.jadwalUjian(id);
  },
  async presensi(id) {
    const { data } = await dosenHttp.get<ApiResponse<PresensiKelas>>(`/dosen-portal/kelas/${id}/presensi`);
    return data.data;
  },
  async rekapKuesioner(id) {
    const { data } = await dosenHttp.get<ApiResponse<RekapKuesionerKelas>>(`/dosen-portal/kelas/${id}/rekap-kuesioner`);
    return data.data;
  },
  async jadwalPerkuliahan(id) {
    const { data } = await dosenHttp.get<ApiResponse<JadwalPerkuliahan>>(`/dosen-portal/kelas/${id}/jadwal-perkuliahan`);
    return data.data;
  },
  async list() {
    const { data } = await dosenHttp.get<ApiResponse<{ id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; sks: number | null; semester?: number | null }[]>>(
      '/dosen-portal/jadwal',
    );
    return data.data.map((j) => ({
      id: j.id,
      kelas: j.kelas,
      kodeMataKuliah: j.kodeMataKuliah,
      namaMataKuliah: j.namaMataKuliah,
      sks: j.sks,
      semester: j.semester ?? null,
      tahunAjaran: '',
      prodi: null,
      tahunKurikulum: null,
      isObe: false,
      dosen: null,
      peserta: 0,
      komposisiTerisi: false,
    }));
  },
  async detail(id) {
    const { data } = await dosenHttp.get<ApiResponse<KelasKuliahDetail>>(`/dosen-portal/kelas/${id}/detail`);
    return data.data;
  },
  async simpanKomposisi() {
    throw new Error('Komposisi nilai kelas diubah lewat menu Input Nilai');
  },
  async hapusKomposisi() {
    throw new Error('Komposisi nilai kelas diubah lewat menu Input Nilai');
  },
};

/** Halaman detail kelas menyediakan klien sesuai portal (provide); komponen kelas memakai useKelasKuliahApi(). */
export const KELAS_KULIAH_API: InjectionKey<KelasKuliahApi> = Symbol('kelasKuliahApi');
export const useKelasKuliahApi = () => inject(KELAS_KULIAH_API, kelasKuliahApi);
