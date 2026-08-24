import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
import type { NilaiMahasiswaDetail, NilaiMahasiswaEntry, NilaiMahasiswaMahasiswa, SemesterSummaryItem } from '@/types/entities';

interface NilaiMahasiswaDetailResponse extends ApiResponse<NilaiMahasiswaDetail> {
  meta: PagingMeta;
}

export interface NilaiEntryUpdatePayload {
  partisipatif?: number;
  proyek?: number;
  quiz?: number;
  tugas?: number;
  uts?: number;
  uas?: number;
}

export const nilaiMahasiswaApi = {
  async searchMahasiswa(query: ListQuery = {}): Promise<ListResult<NilaiMahasiswaMahasiswa>> {
    const { data } = await http.get<ApiResponse<NilaiMahasiswaMahasiswa[]> & { meta: PagingMeta }>('/nilai-mahasiswa', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },

  async getNilaiByMahasiswa(
    mahasiswaId: number | string,
    query: ListQuery = {}
  ): Promise<{ mahasiswa: NilaiMahasiswaMahasiswa; nilai: NilaiMahasiswaDetail['nilai']; meta: PagingMeta }> {
    const { data } = await http.get<NilaiMahasiswaDetailResponse>(`/nilai-mahasiswa/mahasiswa/${mahasiswaId}`, {
      params: query,
    });
    return { mahasiswa: data.data.mahasiswa, nilai: data.data.nilai, meta: data.meta };
  },

  async semesterSummary(): Promise<SemesterSummaryItem[]> {
    const { data } = await http.get<ApiResponse<SemesterSummaryItem[]>>('/nilai-mahasiswa/semester-summary');
    return data.data;
  },

  async listEntries(query: ListQuery = {}): Promise<ListResult<NilaiMahasiswaEntry>> {
    const { data } = await http.get<ApiResponse<NilaiMahasiswaEntry[]> & { meta: PagingMeta }>('/nilai-mahasiswa/entries', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },

  async updateEntry(id: number | string, payload: NilaiEntryUpdatePayload): Promise<NilaiMahasiswaEntry> {
    const { data } = await http.put<ApiResponse<NilaiMahasiswaEntry>>(`/nilai-mahasiswa/entries/${id}`, payload);
    return data.data;
  },
};
