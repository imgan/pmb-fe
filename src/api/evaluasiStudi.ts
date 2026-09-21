import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { EvaluasiStudiRow } from '@/types/entities';

export const evaluasiStudiApi = {
  async list(query: ListQuery = {}): Promise<ListResult<EvaluasiStudiRow>> {
    const { data } = await http.get<ApiResponse<Omit<EvaluasiStudiRow, 'id'>[]> & { meta: ListResult<EvaluasiStudiRow>['meta'] }>(
      '/prodi/evaluasi-studi',
      { params: query }
    );
    // API tidak punya kolom "id" tersendiri (row ini bukan entity CRUD, cuma hasil hitungan
    // per mahasiswa) — pakai mahasiswaId supaya cocok dengan constraint useCrudPage/DataTable.
    return { data: data.data.map((row) => ({ ...row, id: row.mahasiswaId })), meta: data.meta };
  },
};
