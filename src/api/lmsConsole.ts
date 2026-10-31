import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { JenisKonten, TargetKonten } from './elearning';

/** Konsol LMS (modul staf /lms): pemantauan e-learning seluruh kampus per tahun akademik. */
export interface LmsFilter {
  tahunAjaranId?: number | '' | null;
  kodeProdi?: string | null;
  search?: string;
  status?: string | null;
  jenis?: string | null;
  peran?: string | null;
}

export interface LmsOpsi {
  tahunAkademik: { id: number; nama: string; jenisSemester: string | null; isActive: boolean; label: string }[];
  prodi: { kodeProdi: string; nama: string }[];
}

export interface LmsKelasRekap {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  ikon: string | null;
  sks: number | null;
  semester: number | null;
  kodeProdi: string | null;
  prodi: string | null;
  dosen: string | null;
  pengampu: string[];
  peserta: number;
  jumlah: { materi: number; video: number; kuis: number; tugas: number };
  totalKonten: number;
  draf: number;
  mahasiswaAktif: number;
  /** % peserta yang pernah beraktivitas di e-learning kelas. */
  keaktifan: number | null;
  penugasan: number;
  selesai: number;
  /** % konten selesai dari seluruh penugasan (konten × penerima). */
  penyelesaian: number | null;
  rataKuis: number | null;
  rataTugas: number | null;
  tugasBelumDinilai: number;
  interaksi: number;
  kontenTerakhir: string | null;
}

export interface LmsStatKonten {
  penerima: number;
  melihat: number;
  dilihat: number;
  selesai: number;
  penyelesaian: number | null;
  rata: number | null;
  belumDinilai: number;
  terlambat: number;
  soal: number;
  komentar: number;
  suka: number;
}

export interface LmsKonten extends LmsStatKonten {
  id: number;
  jadwalKuliahId: number;
  dosenId: number;
  jenis: JenisKonten;
  judul: string;
  kategori: string | null;
  isWajib: boolean;
  pertemuanKe: number | null;
  tenggat: string | null;
  target: TargetKonten;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  namaDosen: string | null;
  lewatTenggat?: boolean;
  kelas?: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; prodi: string | null; ikon: string | null };
}

export interface LmsDashboard {
  tahunAjaranId: number | null;
  ringkasan: {
    kelas: number;
    kelasDenganKonten: number;
    konten: { materi: number; video: number; kuis: number; tugas: number };
    totalKonten: number;
    draf: number;
    dosenAktif: number;
    mahasiswaAktif: number;
    peserta: number;
    penyelesaian: number | null;
    rataKuis: number | null;
    rataTugas: number | null;
    tugasBelumDinilai: number;
    komentar: number;
    suka: number;
  };
  tren: { awal: string; konten: number; aktivitas: number }[];
  kelasTeraktif: LmsKelasRekap[];
  kelasTanpaKonten: number;
  aktivitasTerbaru: {
    tipe: 'KONTEN' | 'KUIS' | 'TUGAS' | 'SELESAI' | 'KOMENTAR';
    waktu: string;
    pelaku: string | null;
    peran: 'DOSEN' | 'MAHASISWA';
    konten: { id: number; judul: string; jenis: JenisKonten } | null;
    kelas: { id: number; namaMataKuliah: string; kelas: string } | null;
  }[];
}

export interface LmsKelasDetail {
  kelas: {
    id: number;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    sks: number | null;
    semester: number | null;
    ruangan: string | null;
    ikon: string | null;
    prodi: string | null;
    dosen: string | null;
    tahunAjaran: string | null;
    pengampu: string[];
    peserta: number;
  };
  konten: LmsKonten[];
  peserta: {
    id: number;
    nim: string;
    nama: string;
    ditugaskan: number;
    selesai: number;
    penyelesaian: number | null;
    rataKuis: number | null;
    rataTugas: number | null;
    dilihat: number;
    durasi: number;
    terakhirAktif: string | null;
  }[];
}

export interface LmsKontenDetail {
  konten: {
    id: number;
    jenis: JenisKonten;
    judul: string;
    kategori: string | null;
    deskripsi: string | null;
    url: string | null;
    lampiranNama: string | null;
    pertemuanKe: number | null;
    tenggat: string | null;
    target: TargetKonten;
    isWajib: boolean;
    isPublished: boolean;
    createdAt: string;
    namaDosen: string | null;
    jumlahSoal: number;
  };
  kelas: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; prodi: string | null; tahunAjaran: string | null } | null;
  rows: {
    id: number;
    nim: string;
    nama: string;
    grup: string | null;
    dilihat: number;
    durasi: number;
    terakhirDilihat: string | null;
    selesaiAt: string | null;
    skor: number | null;
    benar: string | null;
    terlambat: boolean;
  }[];
}

export interface LmsKomentar {
  id: number;
  isi: string;
  createdAt: string;
  peran: 'DOSEN' | 'MAHASISWA';
  nama: string | null;
  nim: string | null;
  konten: { id: number; judul: string; jenis: JenisKonten };
  kelas: { id: number; namaMataKuliah: string; kodeMataKuliah: string; kelas: string };
}

export interface LmsLaporan {
  tahunAjaranId: number | null;
  perProdi: {
    kodeProdi: string | null;
    prodi: string;
    kelas: number;
    kelasDenganKonten: number;
    konten: number;
    peserta: number;
    mahasiswaAktif: number;
    keaktifan: number | null;
    penugasan: number;
    selesai: number;
    penyelesaian: number | null;
    tugasBelumDinilai: number;
  }[];
  perKelas: LmsKelasRekap[];
}

const bersih = (f: LmsFilter = {}) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const lmsConsoleApi = {
  async opsi(): Promise<LmsOpsi> {
    const { data } = await http.get<ApiResponse<LmsOpsi>>('/lms-console/opsi');
    return data.data;
  },
  async dashboard(f: LmsFilter): Promise<LmsDashboard> {
    const { data } = await http.get<ApiResponse<LmsDashboard>>('/lms-console/dashboard', { params: bersih(f) });
    return data.data;
  },
  async kelas(f: LmsFilter): Promise<LmsKelasRekap[]> {
    const { data } = await http.get<ApiResponse<LmsKelasRekap[]>>('/lms-console/kelas', { params: bersih(f) });
    return data.data;
  },
  async kelasDetail(id: number | string): Promise<LmsKelasDetail> {
    const { data } = await http.get<ApiResponse<LmsKelasDetail>>(`/lms-console/kelas/${id}`);
    return data.data;
  },
  async konten(sumber: 'materi' | 'tugas' | 'kuis', f: LmsFilter): Promise<LmsKonten[]> {
    const { data } = await http.get<ApiResponse<LmsKonten[]>>(`/lms-console/${sumber}`, { params: bersih(f) });
    return data.data;
  },
  async kontenDetail(id: number): Promise<LmsKontenDetail> {
    const { data } = await http.get<ApiResponse<LmsKontenDetail>>(`/lms-console/konten/${id}`);
    return data.data;
  },
  async setTerbit(id: number, isPublished: boolean): Promise<void> {
    await http.patch(`/lms-console/konten/${id}/terbit`, { isPublished });
  },
  async forum(f: LmsFilter): Promise<{ ringkasan: { komentar: number; pengirim: number; konten: number }; rows: LmsKomentar[] }> {
    const { data } = await http.get<ApiResponse<{ ringkasan: { komentar: number; pengirim: number; konten: number }; rows: LmsKomentar[] }>>('/lms-console/forum', { params: bersih(f) });
    return data.data;
  },
  async hapusKomentar(id: number): Promise<void> {
    await http.delete(`/lms-console/forum/${id}`);
  },
  async laporan(f: LmsFilter): Promise<LmsLaporan> {
    const { data } = await http.get<ApiResponse<LmsLaporan>>('/lms-console/laporan', { params: bersih(f) });
    return data.data;
  },
  async exportLaporan(f: LmsFilter): Promise<Blob> {
    const { data } = await http.get('/lms-console/laporan/export', { params: bersih(f), responseType: 'blob' });
    return data;
  },
};
