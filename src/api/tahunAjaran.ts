import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { SemesterGanjilGenap, TahunAjaran } from '@/types/entities';

export interface TahunAjaranPayload {
  nama: string;
  tahunMulai: number;
  tahunSelesai: number;
  jenisSemester: SemesterGanjilGenap;
  isActive?: boolean;
}

export interface MahasiswaLebihMasaStudi {
  id: number;
  nim: string;
  namaLengkap: string;
  semester: number;
  maxSemesterWajar: number;
}

export interface MahasiswaCutiDiproses {
  id: number;
  nim: string;
  namaLengkap: string;
  jumlahSemesterCutiBaru: number;
}

export interface AktivasiTahunAjaranResult {
  tahunAjaran: TahunAjaran;
  totalMahasiswaAktif: number;
  cutiDiproses: MahasiswaCutiDiproses[];
  melebihiMasaStudi: MahasiswaLebihMasaStudi[];
}

const baseApi = createCrudApi<TahunAjaran, TahunAjaranPayload, Partial<TahunAjaranPayload>>('tahun-ajaran');

export const tahunAjaranApi = {
  ...baseApi,

  async activate(id: number | string): Promise<AktivasiTahunAjaranResult> {
    const { data } = await http.post<ApiResponse<AktivasiTahunAjaranResult>>(`/tahun-ajaran/${id}/aktifkan`);
    return data.data;
  },
};
