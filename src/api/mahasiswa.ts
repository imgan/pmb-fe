import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult, ListQuery, ListResult } from '@/types/common';
import type {
  EligibleSummaryItem,
  Mahasiswa,
  MahasiswaBiodata,
  Peserta,
  StatusKeluarMahasiswa,
  StatusMasukMahasiswa,
} from '@/types/entities';

export type MahasiswaBiodataPayload = Partial<Omit<MahasiswaBiodata, 'id' | 'mahasiswaId' | 'createdAt' | 'updatedAt'>>;

export interface MahasiswaUpdatePayload {
  nim?: string;
  namaLengkap?: string;
  email?: string;
  noTelepon?: string | null;
  asalSekolah?: string | null;
  alamat?: string | null;
  golonganKelasId?: number;
  jurusanId?: number;
  tahunMasuk?: number;
  tahunAjaranId?: number | null;
  statusMasuk?: StatusMasukMahasiswa;
  isActive?: boolean;
  statusKeluar?: StatusKeluarMahasiswa | null;
  tanggalKeluar?: string | null;
  alasanKeluar?: string | null;
}

export interface GenerateMahasiswaPayload {
  tahunAjaranId: number;
  jurusanPrefixes: Record<number, string>;
  pesertaIds?: number[];
}

export interface GenerateMahasiswaResult {
  data: Mahasiswa[];
}

const baseApi = createCrudApi<Mahasiswa, never, MahasiswaUpdatePayload>('mahasiswa');

export const mahasiswaApi = {
  list: baseApi.list,
  get: baseApi.get,
  update: baseApi.update,
  remove: baseApi.remove,

  async listEligiblePeserta(query?: ListQuery): Promise<ListResult<Peserta>> {
    const { data } = await http.get<ApiResponse<Peserta[]> & { meta: ListResult<Peserta>['meta'] }>(
      '/mahasiswa/eligible-peserta',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },

  async eligibleSummary(): Promise<EligibleSummaryItem[]> {
    const { data } = await http.get<ApiResponse<EligibleSummaryItem[]>>('/mahasiswa/eligible-summary');
    return data.data;
  },

  async generate(payload: GenerateMahasiswaPayload): Promise<Mahasiswa[]> {
    const { data } = await http.post<ApiResponse<Mahasiswa[]>>('/mahasiswa/generate', payload);
    return data.data;
  },

  async getBiodata(id: number | string): Promise<MahasiswaBiodata | null> {
    const { data } = await http.get<ApiResponse<MahasiswaBiodata | null>>(`/mahasiswa/${id}/biodata`);
    return data.data;
  },

  async saveBiodata(id: number | string, payload: MahasiswaBiodataPayload): Promise<MahasiswaBiodata> {
    const { data } = await http.put<ApiResponse<MahasiswaBiodata>>(`/mahasiswa/${id}/biodata`, payload);
    return data.data;
  },

  async exportExcel(): Promise<Blob> {
    const { data } = await http.get('/mahasiswa/export', { responseType: 'blob' });
    return data;
  },
  async importExcel(file: string): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/mahasiswa/import', { file });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/mahasiswa/import-template', { responseType: 'blob' });
    return data;
  },
};
