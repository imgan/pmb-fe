import { createCrudApi } from './crudFactory';
import type { Peserta, StatusKelulusan, StatusUjian } from '@/types/entities';

export interface PesertaCreatePayload {
  namaLengkap: string;
  asalSekolah: string;
  golonganKelasId: number;
  jurusanId: number;
  noTelepon: string;
  email: string;
  isActive?: boolean;
  statusUjian?: StatusUjian;
  statusKelulusan?: StatusKelulusan;
}

export type PesertaUpdatePayload = Partial<PesertaCreatePayload>;

export const pesertaApi = createCrudApi<Peserta, PesertaCreatePayload, PesertaUpdatePayload>('peserta');
