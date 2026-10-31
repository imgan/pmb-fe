import { dosenHttp } from './dosenHttp';
import type { ApiResponse } from '@/types/common';

/** Portal Dosen → Perkuliahan → Mata Kuliah: mata kuliah yang diajar dosen pada tahun akademik terpilih. */
export interface DosenMataKuliahRow {
  id: number;
  kode: string;
  mataKuliah: string;
  prodi: string | null;
  tahunKurikulum: number | null;
  semester: number | null;
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksTotal: number;
  isObe: boolean;
  jenisMataKuliah: 'TEORI' | 'PRAKTIK' | 'TEORI_PRAKTIK' | null;
  /** Status pengisian RPS (periode mana pun), pemetaan CPL & CPMK. */
  pengisian: { rps: boolean; cpl: boolean; cpmk: boolean };
  /** Aktif (Kurikulum → Matakuliah Aktif) di tahun akademik terpilih. */
  aktif: boolean;
  aktifSemesters: number[];
  kelas: { id: number; kelas: string; peran: 'Koordinator' | 'Pengampu' }[];
  koordinator: boolean;
  /** Koordinator + Setting Prodi "Dosen Bisa Isi Persentase Komponen?" = Ya. */
  bisaUbahRps: boolean;
  alasan: string | null;
}

export const dosenMataKuliahApi = {
  async list(): Promise<{ tahunAjaran: { id: number; nama: string } | null; rows: DosenMataKuliahRow[] }> {
    const { data } = await dosenHttp.get<ApiResponse<{ tahunAjaran: { id: number; nama: string } | null; rows: DosenMataKuliahRow[] }>>(
      '/dosen-portal/rps/daftar-mata-kuliah',
    );
    return data.data;
  },
};
