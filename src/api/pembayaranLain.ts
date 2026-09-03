import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { PembayaranLain, RingkasanBiayaLainRow } from '@/types/entities';

export interface PembayaranLainPayload {
  mahasiswaId: number;
  tarifLainId: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<PembayaranLain, PembayaranLainPayload, Partial<PembayaranLainPayload>>('keuangan/pembayaran-lain');

export const pembayaranLainApi = {
  ...baseApi,
  async ringkasan(nim: string): Promise<RingkasanBiayaLainRow[]> {
    const { data } = await http.get<ApiResponse<RingkasanBiayaLainRow[]>>('/keuangan/pembayaran-lain/ringkasan', {
      params: { nim },
    });
    return data.data;
  },
};
