import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { PerpanjanganTaSkripsi } from '@/types/entities';

export interface PerpanjanganTaSkripsiPayload {
  mahasiswaId: number;
  periode: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<PerpanjanganTaSkripsi, PerpanjanganTaSkripsiPayload, Partial<PerpanjanganTaSkripsiPayload>>(
  'keuangan/perpanjangan-ta-skripsi'
);

export const perpanjanganTaSkripsiApi = {
  ...baseApi,
  async tarif(nim: string, periode: number): Promise<{ mahasiswaId: number; biayaPerpanjangan: number | null }> {
    const { data } = await http.get<ApiResponse<{ mahasiswaId: number; biayaPerpanjangan: number | null }>>(
      '/keuangan/perpanjangan-ta-skripsi/tarif',
      { params: { nim, periode } }
    );
    return data.data;
  },
};
