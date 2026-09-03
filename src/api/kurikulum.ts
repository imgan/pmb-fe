import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult, ListQuery, ListResult } from '@/types/common';
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
  metodePembelajaran?: string | null;
  tanggalMulaiEfektif?: string | null;
  tanggalAkhirEfektif?: string | null;
  idMatkul?: string | null;
  semester?: number | null;
}

const baseKurikulumApi = createCrudApi<Kurikulum, KurikulumPayload, Partial<KurikulumPayload>>('prodi/kurikulum');

export const kurikulumApi = {
  ...baseKurikulumApi,
  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/prodi/kurikulum/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/prodi/kurikulum/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/prodi/kurikulum/import-template', { responseType: 'blob' });
    return data;
  },
};

export const matakuliahAktifApi = {
  async list(query?: ListQuery): Promise<ListResult<Kurikulum>> {
    const { data } = await http.get<ApiResponse<Kurikulum[]> & { meta: ListResult<Kurikulum>['meta'] }>(
      '/prodi/kurikulum/matakuliah-aktif',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
};
