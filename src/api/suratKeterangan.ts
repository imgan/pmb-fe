import { http } from './http';
import { filenameFromDisposition, type NamedBlob } from '@/utils/download';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { JenisSurat, StatusSuratKeterangan, SuratKeterangan, SuratKeteranganCetakData } from '@/types/entities';

export interface SuratKeteranganPayload {
  mahasiswaId: number;
  jenisSurat: JenisSurat;
  nomorSurat?: string | null;
  tanggalInput: string;
  status?: StatusSuratKeterangan;
  semester?: number | null;
  alasan?: string | null;
  namaInstansi?: string | null;
  alamatInstansi?: string | null;
  ipk?: number | null;
  jumlahSks?: number | null;
  namaKoordinator?: string | null;
  noHpKoordinator?: string | null;
  tanggalUjianMulai?: string | null;
  tanggalUjianSelesai?: string | null;
}

const baseApi = createCrudApi<SuratKeterangan, SuratKeteranganPayload, Partial<SuratKeteranganPayload>>(
  'laporan/cetak-surat'
);

export const suratKeteranganApi = {
  ...baseApi,

  async cetakData(id: number | string): Promise<SuratKeteranganCetakData> {
    const { data } = await http.get<ApiResponse<SuratKeteranganCetakData>>(`/laporan/cetak-surat/${id}/cetak`);
    return data.data;
  },

  async cetakPdf(id: number | string): Promise<NamedBlob> {
    const { data, headers } = await http.get(`/laporan/cetak-surat/${id}/pdf`, { responseType: 'blob' });
    return { blob: data, filename: filenameFromDisposition(headers['content-disposition'], `surat-${id}.pdf`) };
  },
};
