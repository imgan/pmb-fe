import { createCrudApi } from './crudFactory';
import type { PembayaranSertifikasi, StatusSertifikasi } from '@/types/entities';

export interface PembayaranSertifikasiPayload {
  nim: string;
  tanggalBayar: string;
  noBukti: string;
  jenisPembayaran: string;
  caraPembayaran: string;
  tanggalPelaksanaan?: string | null;
  waktuPelaksanaan?: string | null;
  bayar: number;
  kodeBank?: string | null;
  keterangan?: string | null;
  statusSertifikasi?: StatusSertifikasi;
  buktiPembayaran?: string | null;
}

export const pembayaranSertifikasiApi = createCrudApi<
  PembayaranSertifikasi,
  PembayaranSertifikasiPayload,
  Partial<PembayaranSertifikasiPayload>
>('keuangan/pembayaran-sertifikasi');
