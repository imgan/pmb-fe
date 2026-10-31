import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { Peserta, PesertaBiodata, PesertaDokumenStatus, StatusKelulusan, StatusUjian } from '@/types/entities';

export interface GrafikTahunanRow {
  tahun: number;
  tamu: number;
  mendaftar: number;
  daftarUlang: number;
}

export interface DashboardJumlah {
  label: string;
  jumlah: number;
}

export interface DashboardPencapaian {
  kodeProdi: string;
  nama: string;
  pendaftar: number;
  diterima: number;
  target: number | null;
}

export interface DashboardPmb {
  tahunPmb: { id: number; label: string; isActive: boolean } | null;
  tahunList: { id: number; label: string; isActive: boolean }[];
  ringkasan: { pendaftar: number; siapTes: number; lulusSeleksi: number; diterima: number };
  trend: DashboardJumlah[];
  pencapaian: DashboardPencapaian[];
  jalur: DashboardJumlah[];
  sumberInformasi: DashboardJumlah[];
  belumIsiSumber: number;
  topSekolah: DashboardJumlah[];
  wilayah: DashboardJumlah[];
  gender: DashboardJumlah[];
  belumIsiBiodata: number;
}

export interface PesertaCreatePayload {
  namaLengkap: string;
  asalSekolah: string;
  golonganKelasId: number;
  jurusanId: number;
  noTelepon: string;
  email: string;
  sumberInformasiId?: number | null;
  beasiswaId?: number | null;
  isActive?: boolean;
  statusUjian?: StatusUjian;
  statusKelulusan?: StatusKelulusan;
  /** Biodata dibuat sekaligus (admin, form Tambah Peserta); langsung terkunci. */
  biodata?: Omit<PesertaBiodata, 'id' | 'pesertaId' | 'isLocked'>;
}

export type PesertaUpdatePayload = Partial<Omit<PesertaCreatePayload, 'biodata'>>;

export const pesertaApi = {
  ...createCrudApi<Peserta, PesertaCreatePayload, PesertaUpdatePayload>('peserta'),
  async grafikTahunan(query: { dariTanggal?: string; sampaiTanggal?: string } = {}): Promise<GrafikTahunanRow[]> {
    const { data } = await http.get<ApiResponse<GrafikTahunanRow[]>>('/peserta/grafik-tahunan', { params: query });
    return data.data;
  },
  /** tahunPmbId kosong = tahun PMB aktif; 'semua' = seluruh tahun. */
  async dashboard(tahunPmbId?: number | 'semua'): Promise<DashboardPmb> {
    const { data } = await http.get<ApiResponse<DashboardPmb>>('/peserta/dashboard', { params: { tahunPmbId } });
    return data.data;
  },
  /** Target kosong/0 menghapus target prodi tsb. */
  async saveTarget(tahunPmbId: number, items: { kodeProdi: string; target: number | null }[]): Promise<void> {
    await http.put('/peserta/dashboard/target', { tahunPmbId, items });
  },
  /** Admin: isi/ubah biodata atas nama peserta (status kunci tidak berubah). */
  async saveBiodata(id: number, payload: Omit<PesertaBiodata, 'id' | 'pesertaId' | 'isLocked'>): Promise<Peserta> {
    const { data } = await http.put<ApiResponse<Peserta>>(`/peserta/${id}/biodata`, payload);
    return data.data;
  },
  /** Admin: false = buka kunci (peserta bisa mengubah biodata lagi), true = kunci. */
  async setBiodataLock(id: number, isLocked: boolean): Promise<Peserta> {
    const { data } = await http.put<ApiResponse<Peserta>>(`/peserta/${id}/biodata/kunci`, { isLocked });
    return data.data;
  },
  async removeBiodata(id: number): Promise<Peserta> {
    const { data } = await http.delete<ApiResponse<Peserta>>(`/peserta/${id}/biodata`);
    return data.data;
  },
  /** Admin: status upload tiap jenis dokumen kelengkapan milik peserta. */
  async listDokumen(id: number): Promise<PesertaDokumenStatus[]> {
    const { data } = await http.get<ApiResponse<PesertaDokumenStatus[]>>(`/peserta/${id}/dokumen`);
    return data.data;
  },
  /** Reset password peserta ke default (nomor HP); peserta wajib menggantinya saat login berikutnya. */
  async resetPasswordDefault(id: number): Promise<{ username: string; email: string }> {
    const { data } = await http.post<ApiResponse<{ username: string; email: string }>>(`/peserta/${id}/reset-password-default`);
    return data.data;
  },
};
