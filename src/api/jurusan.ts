import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { Jurusan } from '@/types/entities';

export interface JurusanPayload {
  golonganKelasId: number;
  namaJurusan: string;
  foto?: string | null;
  prospekKarir?: string | null;
  jenjangPendidikan?: string | null;
  gelarSingkat?: string | null;
  gelarLengkap?: string | null;
  namaFakultas?: string | null;
}

const baseApi = createCrudApi<Jurusan, JurusanPayload, Partial<JurusanPayload>>('jurusan');

export const jurusanApi = {
  ...baseApi,

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/jurusan/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/jurusan/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/jurusan/import-template', { responseType: 'blob' });
    return data;
  },
};
