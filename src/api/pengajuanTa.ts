import { http } from './http';
import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';

export type StatusPengajuanTa = 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';

export const STATUS_PENGAJUAN_TA_LABEL: Record<StatusPengajuanTa, string> = {
  DIAJUKAN: 'Menunggu Verifikasi',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};
export const STATUS_PENGAJUAN_TA_VARIANT: Record<StatusPengajuanTa, 'success' | 'warning' | 'danger'> = {
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};

export interface PeriodePengajuanTa {
  id: number;
  jurusanId: number | null;
  jurusan?: { id: number; namaJurusan: string } | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string | null;
  isActive: boolean;
  jumlahPengajuan?: number;
}

interface DosenRingkas {
  id: number;
  namaLengkap: string;
  gelar: string | null;
}

export interface PengajuanTa {
  id: number;
  periodePengajuanTaId: number;
  mahasiswaId: number;
  noTelepon: string | null;
  email: string | null;
  judul: string;
  tempatKkp: string | null;
  pembimbingUtamaId: number | null;
  pembimbingPendampingId: number | null;
  status: StatusPengajuanTa;
  catatanProdi: string | null;
  diverifikasiAt: string | null;
  createdAt: string;
  periode?: { id: number; tanggalMulai: string; tanggalSelesai: string } | null;
  pembimbingUtama?: DosenRingkas | null;
  pembimbingPendamping?: DosenRingkas | null;
  verifikator?: { id: number; name: string } | null;
  mahasiswa?: { id: number; nim: string; namaLengkap: string; jurusan?: { namaJurusan: string } | null };
}

export const namaDosenRingkas = (d?: DosenRingkas | null) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : '-');

export interface PeriodePayload {
  jurusanId: number | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string | null;
  isActive: boolean;
}

/** Modul Prodi: periode pengajuan & verifikasi pengajuan TA/Skripsi. */
export const pengajuanTaApi = {
  async listPeriode(query?: ListQuery & { jurusanId?: number }): Promise<ListResult<PeriodePengajuanTa>> {
    const { data } = await http.get<ApiResponse<PeriodePengajuanTa[]> & { meta: ListResult<PeriodePengajuanTa>['meta'] }>(
      '/pengajuan-ta/periode',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async createPeriode(payload: PeriodePayload): Promise<PeriodePengajuanTa> {
    const { data } = await http.post<ApiResponse<PeriodePengajuanTa>>('/pengajuan-ta/periode', payload);
    return data.data;
  },
  async updatePeriode(id: number, payload: Partial<PeriodePayload>): Promise<PeriodePengajuanTa> {
    const { data } = await http.put<ApiResponse<PeriodePengajuanTa>>(`/pengajuan-ta/periode/${id}`, payload);
    return data.data;
  },
  async removePeriode(id: number): Promise<void> {
    await http.delete(`/pengajuan-ta/periode/${id}`);
  },
  async list(query?: ListQuery & { periodeId?: number; status?: string; jurusanId?: number }): Promise<ListResult<PengajuanTa>> {
    const { data } = await http.get<ApiResponse<PengajuanTa[]> & { meta: ListResult<PengajuanTa>['meta'] }>('/pengajuan-ta', { params: query });
    return { data: data.data, meta: data.meta };
  },
  async verifikasi(
    id: number,
    payload: { status: StatusPengajuanTa; catatanProdi: string | null; judul?: string; pembimbingUtamaId?: number | null; pembimbingPendampingId?: number | null }
  ): Promise<PengajuanTa> {
    const { data } = await http.put<ApiResponse<PengajuanTa>>(`/pengajuan-ta/${id}/verifikasi`, payload);
    return data.data;
  },
};

export interface FormTugasAkhir {
  mahasiswa: { nim: string; namaLengkap: string; prodi: string | null; email: string | null; noTelepon: string | null };
  periode: PeriodePengajuanTa | null;
  pilihanPembimbingUtama: { value: number; label: string }[];
  pilihanPembimbingPendamping: { value: number; label: string }[];
  pilihanTempatKkp: string[];
  pengajuan: PengajuanTa[];
}

export interface AjukanTaPayload {
  noTelepon: string | null;
  email: string | null;
  judul: string;
  tempatKkp: string | null;
  pembimbingUtamaId: number;
  pembimbingPendampingId: number | null;
}

/** Portal mahasiswa: pengajuan judul TA/Skripsi. */
export const mahasiswaTugasAkhirApi = {
  async form(): Promise<FormTugasAkhir> {
    const { data } = await mahasiswaHttp.get<ApiResponse<FormTugasAkhir>>('/mahasiswa-portal/tugas-akhir');
    return data.data;
  },
  async ajukan(payload: AjukanTaPayload): Promise<{ message: string }> {
    const { data } = await mahasiswaHttp.post('/mahasiswa-portal/tugas-akhir', payload);
    return data;
  },
  async batalkan(id: number): Promise<void> {
    await mahasiswaHttp.delete(`/mahasiswa-portal/tugas-akhir/${id}`);
  },
};
