import { createCrudApi } from './crudFactory';
import type { PembayaranKuliah } from '@/types/entities';

export interface PembayaranKuliahPayload {
  tagihanKuliahId: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

export const pembayaranKuliahApi = createCrudApi<PembayaranKuliah, PembayaranKuliahPayload, Partial<PembayaranKuliahPayload>>(
  'keuangan/pembayaran-kuliah'
);
