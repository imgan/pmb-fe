import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { Kurikulum, KelompokMataKuliah, KelompokKurikulum, JenisMataKuliah, KelompokKompetensi } from '@/types/entities';

export interface KurikulumPayload {
  jurusanId?: number | null;
  tahunAjaranId?: number | null;
  kode: string;
  mataKuliah: string;
  mataKuliahEn?: string | null;
  kelompokMataKuliah?: KelompokMataKuliah | null;
  kelompokKurikulum?: KelompokKurikulum | null;
  jenisMataKuliah?: JenisMataKuliah | null;
  sksTeori?: number;
  sksPraktek?: number;
  sksLab?: number;
  sksSimulasi?: number;
  kelompokKompetensi?: KelompokKompetensi | null;
  kompIlmuKomputer?: string | null;
  mataKuliahMinat?: string | null;
  muatanMataKuliah?: string | null;
  semester?: number | null;
}

export const kurikulumApi = createCrudApi<Kurikulum, KurikulumPayload, Partial<KurikulumPayload>>('prodi/kurikulum');

export const matakuliahAktifApi = {
  async list(query?: ListQuery): Promise<ListResult<Kurikulum>> {
    const { data } = await http.get<ApiResponse<Kurikulum[]> & { meta: ListResult<Kurikulum>['meta'] }>(
      '/prodi/kurikulum/matakuliah-aktif',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
};
