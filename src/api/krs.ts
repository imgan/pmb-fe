import { createCrudApi } from './crudFactory';
import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { Krs, StatusKrs } from '@/types/entities';

export interface KrsPayload {
  mahasiswaId: number;
  semester: number;
  tahunAjaranId: number;
  status?: StatusKrs;
  jadwalKuliahIds?: number[];
}

export interface KuotaSks {
  ipSemesterSebelumnya: number | null;
  maxSks: number | null;
}

export const krsApi = {
  ...createCrudApi<Krs, KrsPayload, Partial<KrsPayload>>('krs'),
  async kuota(mahasiswaId: number, semester: number): Promise<KuotaSks> {
    const { data } = await http.get<ApiResponse<KuotaSks>>('/krs/kuota', { params: { mahasiswaId, semester } });
    return data.data;
  },
};
