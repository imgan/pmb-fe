import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { PembayaranTaSkripsi } from '@/types/entities';

export interface PembayaranTaSkripsiPayload {
  mahasiswaId: number;
  periode: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<PembayaranTaSkripsi, PembayaranTaSkripsiPayload, Partial<PembayaranTaSkripsiPayload>>(
  'keuangan/pembayaran-ta-skripsi'
);

export const pembayaranTaSkripsiApi = {
  ...baseApi,
  async tarif(nim: string, periode: number): Promise<{ mahasiswaId: number; biayaPendaftaran: number | null }> {
    const { data } = await http.get<ApiResponse<{ mahasiswaId: number; biayaPendaftaran: number | null }>>(
      '/keuangan/pembayaran-ta-skripsi/tarif',
      { params: { nim, periode } }
    );
    return data.data;
  },
};
