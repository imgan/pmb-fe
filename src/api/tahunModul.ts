import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { SemesterGanjilGenap, TahunModul } from '@/types/entities';

/** Tahun Ajaran PMB & Tahun Ajaran Keuangan (Modul Admin › Master) — data periode sendiri, terpisah dari tahun akademik. */
export interface TahunModulPayload {
  nama: string;
  tahunMulai: number;
  tahunSelesai: number;
  jenisSemester: SemesterGanjilGenap;
  isActive?: boolean;
}
export type ModulTahun = 'pmb' | 'keuangan' | 'frs' | 'ta-skripsi' | 'sp';

const buatApi = (modul: ModulTahun) => {
  const base = createCrudApi<TahunModul, TahunModulPayload, Partial<TahunModulPayload>>(`tahun-${modul}`);
  return {
    ...base,
    async activate(id: number): Promise<TahunModul> {
      const { data } = await http.post<ApiResponse<TahunModul>>(`/tahun-${modul}/${id}/aktifkan`);
      return data.data;
    },
  };
};

export const tahunPmbApi = buatApi('pmb');
export const tahunKeuanganApi = buatApi('keuangan');
export const tahunModulApi = (modul: ModulTahun) => (modul === 'pmb' ? tahunPmbApi : tahunKeuanganApi);
