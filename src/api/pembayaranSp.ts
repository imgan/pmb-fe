import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { PembayaranSp } from '@/types/entities';

export interface PembayaranSpPayload {
  mahasiswaId: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<PembayaranSp, PembayaranSpPayload, Partial<PembayaranSpPayload>>('keuangan/pembayaran-sp');

export const pembayaranSpApi = {
  ...baseApi,
  async tarif(nim: string): Promise<{ mahasiswaId: number; biayaSp: number | null }> {
    const { data } = await http.get<ApiResponse<{ mahasiswaId: number; biayaSp: number | null }>>(
      '/keuangan/pembayaran-sp/tarif',
      { params: { nim } }
    );
    return data.data;
  },
};
