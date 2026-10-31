import { dosenHttp } from './dosenHttp';
import type { ApiResponse } from '@/types/common';
import type { BobotObe, KomponenObe } from './bobotObe';
import type { InfoKelasDosen } from './dosenPortal';

/** Input Nilai kelas OBE (portal dosen): kolom = komponen Komposisi Nilai Kelas (metode / sub metode). */
export interface KolomNilaiObe {
  /** Sel komponen × CPMK: "1|<cpmkId>" / "1.2|<cpmkId>"; "1" / "1.2" bila mata kuliah tanpa CPMK. */
  kunci: string;
  /** "1" = metode ke-1 tanpa sub, "1.2" = sub ke-2 metode ke-1. */
  komponen: string;
  metode: string;
  nama: string | null;
  cpmkId: number | null;
  cpmkKode: string | null;
  jenis: KomponenObe;
  syaratLulus: boolean;
  /** Bobot efektif terhadap nilai akhir (%). */
  bobot: number;
}

export interface NilaiObeKelas {
  isObe: boolean;
  kelas: InfoKelasDosen;
  komposisi: BobotObe | null;
  kolom: KolomNilaiObe[];
  /** CPMK mata kuliah (sesuai level Pemetaan CPMK). */
  cpmk: { id: number; kode: string; deskripsi: string }[];
  /** true = komposisi belum memetakan nilai CPMK; bobot komponen dibagi rata ke CPMK. */
  cpmkRata: boolean;
  /** KELAS = komposisi kelas; RPS = mengikuti Rencana Evaluasi RPS yang lebih baru (diselaraskan saat simpan). */
  sumber: 'KELAS' | 'RPS' | null;
  perluSinkron: boolean;
  adaKomposisiRps: boolean;
  periodeRps: { id: number; nama: string } | null;
  mahasiswa: {
    no: number;
    mahasiswaId: number;
    nim: string;
    namaLengkap: string;
    nilaiKomponen: Record<string, number | null>;
    nilai: number | null;
    grade: string | null;
  }[];
}

export const dosenNilaiObeApi = {
  async get(jadwalKuliahId: number): Promise<NilaiObeKelas> {
    const { data } = await dosenHttp.get<ApiResponse<NilaiObeKelas>>(`/dosen-portal/kelas/${jadwalKuliahId}/nilai-obe`);
    return data.data;
  },
  async simpan(jadwalKuliahId: number, items: { mahasiswaId: number; nilai: Record<string, number | null> }[]): Promise<NilaiObeKelas> {
    const { data } = await dosenHttp.put<ApiResponse<NilaiObeKelas>>(`/dosen-portal/kelas/${jadwalKuliahId}/nilai-obe`, { items });
    return data.data;
  },
  async komposisiDariRps(jadwalKuliahId: number): Promise<NilaiObeKelas> {
    const { data } = await dosenHttp.post<ApiResponse<NilaiObeKelas>>(`/dosen-portal/kelas/${jadwalKuliahId}/komposisi-dari-rps`);
    return data.data;
  },
};
