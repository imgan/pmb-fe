import { createCrudApi } from './crudFactory';
import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
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

export interface HasilSetujuiMassal {
  disetujui: number;
  dilewati: { id: number; alasan: string }[];
}

export const krsApi = {
  ...createCrudApi<Krs, KrsPayload, Partial<KrsPayload>>('krs'),
  async kuota(mahasiswaId: number, semester: number): Promise<KuotaSks> {
    const { data } = await http.get<ApiResponse<KuotaSks>>('/krs/kuota', { params: { mahasiswaId, semester } });
    return data.data;
  },
  /** PDF daftar KRS sesuai filter halaman. */
  async cetak(query: ListQuery = {}): Promise<Blob> {
    const { data } = await http.get('/krs/cetak', { params: query, responseType: 'blob' });
    return data;
  },
  /** Hak prerogatif BAAK: setujui banyak KRS sekaligus. */
  async setujuiMassal(ids: number[]): Promise<HasilSetujuiMassal> {
    const { data } = await http.post<ApiResponse<HasilSetujuiMassal>>('/krs/setujui-massal', { ids });
    return data.data;
  },
};

/** KRS Mahasiswa modul Prodi (hanya lihat) — backend membatasi ke prodi sesi (prodiScope). */
export const krsProdiApi = {
  async list(query: ListQuery = {}): Promise<ListResult<Krs>> {
    const { data } = await http.get<ApiResponse<Krs[]> & { meta: PagingMeta }>('/prodi/krs', { params: query });
    return { data: data.data, meta: data.meta };
  },
};
