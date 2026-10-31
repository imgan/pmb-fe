import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type {
  LaporanSertifikasiRow,
  LaporanTunggakanJurusanRow,
  LaporanTunggakanRow,
  LaporanUangKuliahRow,
  RingkasanBiayaLainRow,
  RingkasanTaSkripsiPeriode,
  StatusSertifikasi,
} from '@/types/entities';

export interface LaporanKeuanganQuery {
  tahunAjaranId?: number;
  /** Filter prodi (kode prodi, mencakup kelas Reguler & Karyawan). */
  kodeProdi?: string;
}

export interface LaporanSertifikasiQuery {
  dateFrom?: string;
  dateTo?: string;
  statusSertifikasi?: StatusSertifikasi;
}

export const laporanKeuanganApi = {
  async tunggakanMahasiswa(query: LaporanKeuanganQuery = {}): Promise<LaporanTunggakanRow[]> {
    const { data } = await http.get<ApiResponse<LaporanTunggakanRow[]>>('/keuangan/laporan/tunggakan-mahasiswa', {
      params: query,
    });
    return data.data;
  },
  async bebasTunggakan(query: LaporanKeuanganQuery = {}): Promise<LaporanTunggakanRow[]> {
    const { data } = await http.get<ApiResponse<LaporanTunggakanRow[]>>('/keuangan/laporan/bebas-tunggakan', {
      params: query,
    });
    return data.data;
  },
  /** Bukti bebas tunggakan satu mahasiswa (PDF, lampiran sidang). */
  async bebasTunggakanPdf(mahasiswaId: number): Promise<Blob> {
    const { data } = await http.get(`/keuangan/laporan/bebas-tunggakan/${mahasiswaId}/pdf`, { responseType: 'blob' });
    return data;
  },
  async uangKuliah(
    query: LaporanKeuanganQuery = {}
  ): Promise<{ data: LaporanUangKuliahRow[]; grandTotal: Omit<LaporanUangKuliahRow, 'prodi'> }> {
    const { data } = await http.get<ApiResponse<LaporanUangKuliahRow[]> & { meta: { grandTotal: Omit<LaporanUangKuliahRow, 'prodi'> } }>(
      '/keuangan/laporan/uang-kuliah',
      { params: query }
    );
    return { data: data.data, grandTotal: data.meta.grandTotal };
  },
  async tunggakan(
    query: LaporanKeuanganQuery = {}
  ): Promise<{ data: LaporanTunggakanJurusanRow[]; grandTotal: Omit<LaporanTunggakanJurusanRow, 'prodi'> }> {
    const { data } = await http.get<
      ApiResponse<LaporanTunggakanJurusanRow[]> & { meta: { grandTotal: Omit<LaporanTunggakanJurusanRow, 'prodi'> } }
    >('/keuangan/laporan/tunggakan', { params: query });
    return { data: data.data, grandTotal: data.meta.grandTotal };
  },
  async exportTunggakan(query: LaporanKeuanganQuery = {}): Promise<Blob> {
    const { data } = await http.get('/keuangan/laporan/tunggakan/export', {
      params: query,
      responseType: 'blob',
    });
    return data;
  },
  async sertifikasi(
    query: LaporanSertifikasiQuery = {}
  ): Promise<{ data: LaporanSertifikasiRow[]; grandTotal: Omit<LaporanSertifikasiRow, 'jenisPembayaran'> }> {
    const { data } = await http.get<
      ApiResponse<LaporanSertifikasiRow[]> & { meta: { grandTotal: Omit<LaporanSertifikasiRow, 'jenisPembayaran'> } }
    >('/keuangan/laporan/sertifikasi', { params: query });
    return { data: data.data, grandTotal: data.meta.grandTotal };
  },
  async tunggakanTaSkripsi(nim: string): Promise<RingkasanTaSkripsiPeriode[]> {
    const { data } = await http.get<ApiResponse<RingkasanTaSkripsiPeriode[]>>('/keuangan/laporan/tunggakan-mahasiswa/ta-skripsi', {
      params: { nim },
    });
    return data.data;
  },
  async tunggakanBiayaLain(nim: string): Promise<RingkasanBiayaLainRow[]> {
    const { data } = await http.get<ApiResponse<RingkasanBiayaLainRow[]>>('/keuangan/laporan/tunggakan-mahasiswa/biaya-lain', {
      params: { nim },
    });
    return data.data;
  },
  async exportTunggakanPerMahasiswa(query: LaporanKeuanganQuery = {}): Promise<Blob> {
    const { data } = await http.get('/keuangan/laporan/tunggakan-mahasiswa/export/mahasiswa', {
      params: query,
      responseType: 'blob',
    });
    return data;
  },
  async exportTunggakanPerJurusan(query: LaporanKeuanganQuery = {}): Promise<Blob> {
    const { data } = await http.get('/keuangan/laporan/tunggakan-mahasiswa/export/jurusan', {
      params: query,
      responseType: 'blob',
    });
    return data;
  },
};
