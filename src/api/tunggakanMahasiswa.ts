import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { TunggakanMahasiswa } from '@/types/entities';
import type { RiwayatPembayaranMahasiswa } from './tagihanKuliah';

export interface TunggakanMahasiswaPayload {
  nim: string;
  tanggal: string;
  nominal: number;
  keterangan?: string | null;
}

const baseApi = createCrudApi<TunggakanMahasiswa, TunggakanMahasiswaPayload, Partial<TunggakanMahasiswaPayload>>(
  'keuangan/tunggakan-mahasiswa'
);

export interface TunggakanOtomatisRow {
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  prodi: string;
  angkatan: number | null;
  rincian: { periode: string; semester: number; sisa: number }[];
  totalTunggakan: number;
}

export const tunggakanMahasiswaApi = {
  ...baseApi,

  /** Tunggakan otomatis dari sisa tagihan semester sebelum tahun ajaran aktif. */
  async listOtomatis(query: { page?: number; limit?: number; search?: string } = {}) {
    const { data } = await http.get<
      ApiResponse<TunggakanOtomatisRow[]> & {
        meta: { total: number; page: number; limit: number; totalPages: number; tahunAjaranAktif: string | null; totalNominal: number };
      }
    >('/keuangan/tunggakan-mahasiswa/otomatis', { params: query });
    return { data: data.data, meta: data.meta };
  },
  async riwayatPembayaran(mahasiswaId: number): Promise<RiwayatPembayaranMahasiswa> {
    const { data } = await http.get<ApiResponse<RiwayatPembayaranMahasiswa>>(`/keuangan/tunggakan-mahasiswa/riwayat-pembayaran/${mahasiswaId}`);
    return data.data;
  },
  async exportOtomatis(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tunggakan-mahasiswa/otomatis/export', { responseType: 'blob' });
    return data;
  },

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tunggakan-mahasiswa/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/keuangan/tunggakan-mahasiswa/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/tunggakan-mahasiswa/import-template', { responseType: 'blob' });
    return data;
  },
};
