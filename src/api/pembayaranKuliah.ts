import { createCrudApi } from './crudFactory';
import { http } from './http';
import type { PembayaranKuliah } from '@/types/entities';

export interface PembayaranKuliahPayload {
  tagihanKuliahId: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<PembayaranKuliah, PembayaranKuliahPayload, Partial<PembayaranKuliahPayload>>(
  'keuangan/pembayaran-kuliah'
);

export const pembayaranKuliahApi = {
  ...baseApi,
  /** Kwitansi PDF satu pembayaran (format sama dengan kwitansi di portal mahasiswa). */
  async kwitansiPdf(id: number): Promise<Blob> {
    const { data } = await http.get(`/keuangan/pembayaran-kuliah/${id}/kwitansi`, { responseType: 'blob' });
    return data;
  },
};
