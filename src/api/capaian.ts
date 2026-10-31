import { http } from './http';
import type { ApiResponse } from '@/types/common';

/** Manajemen Capaian (OBE) per kurikulum — Profil Lulusan, CPL, pemetaan PL→CPL & CPL→MK. */
export type AspekCpl = 'SIKAP' | 'PENGETAHUAN' | 'KETERAMPILAN_UMUM' | 'KETERAMPILAN_KHUSUS';
/** Metode pembobotan PL → CPL: MANUAL (diisi sendiri) / OTOMATIS (rata per PL). */
export type MetodeBobot = 'MANUAL' | 'OTOMATIS';
/** Level pemetaan CPL → MK: CPL (sampai CPL induk) / IK (sampai Indikator Kinerja). */
export type LevelPemetaan = 'CPL' | 'IK';

export interface StatusCapaian {
  jumlahPl: number;
  jumlahCpl: number;
  plCplPersen: number;
  cplMkPersen: number;
  jumlahMataKuliah: number;
  jumlahMkObe: number;
  isObe: boolean;
}

export interface CapaianRow extends StatusCapaian {
  id: number;
  nama: string;
  tahunKurikulum: number | null;
  isActive: boolean;
  jurusanId: number | null;
  prodi: string | null;
  jenjang: string | null;
  ketuaProdi: string | null;
}

export interface ProfilLulusan {
  id: number;
  kurikulumId: number;
  kode: string;
  /** Nama profil, mis. "Pemikir Kritis & Analitis". */
  nama: string;
  deskripsi: string;
  /** Deskripsi Bahasa Inggris (opsional). */
  deskripsiEn: string | null;
  profesi: string | null;
}

export interface Cpl {
  id: number;
  kurikulumId: number;
  /** null = CPL; terisi = Indikator Kinerja (IK) milik CPL induk tsb. */
  parentId: number | null;
  kode: string;
  /** Kategori (aspek) CPL; IK tidak memakai kategori. */
  aspek: AspekCpl | null;
  deskripsi: string;
  deskripsiEn: string | null;
}

export interface CapaianDetail {
  kurikulum: StatusCapaian & {
    id: number;
    nama: string;
    tahunKurikulum: number | null;
    kodeProdi: string | null;
    prodi: string | null;
    jenjang: string | null;
    ketuaProdi: string | null;
    metodeBobotPlCpl: MetodeBobot;
    levelPemetaanCplMk: LevelPemetaan;
  };
  profilLulusan: ProfilLulusan[];
  cpl: Cpl[];
  mataKuliah: { id: number; kode: string; mataKuliah: string; semester: number | null; sksTotal: number; isObe: boolean }[];
  /** bobot = persen kontribusi CPL ke PL (total per PL = 100). */
  plCpl: { profilLulusanId: number; cplId: number; bobot: number }[];
  cplMk: { cplId: number; mataKuliahId: number }[];
}

export interface CapaianQuery {
  tahunKurikulum?: number;
  jenjang?: string;
  jurusanId?: number;
  jenis?: 'OBE' | 'NON_OBE';
}

export const capaianApi = {
  async list(query: CapaianQuery = {}): Promise<CapaianRow[]> {
    const { data } = await http.get<ApiResponse<CapaianRow[]>>('/prodi/capaian', { params: query });
    return data.data;
  },
  async filterOptions(): Promise<{ tahunKurikulum: number[]; jenjang: string[] }> {
    const { data } = await http.get<ApiResponse<{ tahunKurikulum: number[]; jenjang: string[] }>>('/prodi/capaian/filter-options');
    return data.data;
  },
  async laporan(query: CapaianQuery = {}): Promise<Blob> {
    const { data } = await http.get('/prodi/capaian/laporan', { params: query, responseType: 'blob' });
    return data;
  },
  async detail(kurikulumId: number | string): Promise<CapaianDetail> {
    const { data } = await http.get<ApiResponse<CapaianDetail>>(`/prodi/capaian/${kurikulumId}`);
    return data.data;
  },
  async saveItem(
    jenis: 'pl' | 'cpl',
    kurikulumId: number,
    payload: {
      kode: string;
      deskripsi: string;
      nama?: string;
      deskripsiEn?: string | null;
      profesi?: string | null;
      aspek?: AspekCpl | null;
      parentId?: number | null;
    },
    id?: number
  ) {
    if (id) await http.put(`/prodi/capaian/${kurikulumId}/${jenis}/${id}`, payload);
    else await http.post(`/prodi/capaian/${kurikulumId}/${jenis}`, payload);
  },
  async removeItem(jenis: 'pl' | 'cpl', kurikulumId: number, id: number) {
    await http.delete(`/prodi/capaian/${kurikulumId}/${jenis}/${id}`);
  },
  /** Salin PL / CPL dari kurikulum lain (kode yang sudah ada dilewati). */
  async salin(jenis: 'pl' | 'cpl', kurikulumId: number, dariKurikulumId: number): Promise<string> {
    const { data } = await http.post<ApiResponse<{ disalin: number; dilewati: number }>>(`/prodi/capaian/${kurikulumId}/${jenis}/salin`, { dariKurikulumId });
    return data.message;
  },
  async savePlCpl(kurikulumId: number, metode: MetodeBobot, pairs: { profilLulusanId: number; cplId: number; bobot: number | null }[]) {
    await http.put(`/prodi/capaian/${kurikulumId}/pemetaan/pl-cpl`, { metode, pairs });
  },
  /** cplId = CPL induk (level CPL) atau IK / CPL tanpa IK (level IK). */
  async saveCplMk(kurikulumId: number, level: LevelPemetaan, pairs: { cplId: number; mataKuliahId: number }[]) {
    await http.put(`/prodi/capaian/${kurikulumId}/pemetaan/cpl-mk`, { level, pairs });
  },
};
