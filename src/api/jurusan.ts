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

/** Master Jurusan / Prodi: satu prodi dengan banyak golongan kelas. */
export interface ProdiGrup {
  /** Id salah satu baris jurusan prodi ini. */
  id: number;
  namaJurusan: string;
  kodeProdi: string | null;
  singkatan: string | null;
  foto: string | null;
  prospekKarir: string | null;
  jenjangPendidikan: string | null;
  gelarSingkat: string | null;
  gelarLengkap: string | null;
  namaFakultas: string | null;
  /** dipakai = jumlah data di modul lain; yang masih dipakai tidak bisa dilepas. */
  golongan: { jurusanId: number; golonganKelasId: number; namaKelas: string; dipakai: number }[];
}

export type ProdiGrupPayload = Omit<ProdiGrup, 'id' | 'golongan'> & { golonganKelasIds: number[] };

const baseApi = createCrudApi<Jurusan, JurusanPayload, Partial<JurusanPayload>>('jurusan');
const grupApi = createCrudApi<ProdiGrup, ProdiGrupPayload, ProdiGrupPayload>('jurusan/grup');

export const jurusanApi = {
  ...baseApi,
  grup: grupApi,

  /**
   * Satu baris per prodi (kode prodi) untuk dropdown akademik. Tabel jurusan menyimpan prodi per
   * golongan kelas (Reguler/Karyawan/Kelas Malam) untuk pendaftaran PMB, jadi satu prodi bisa
   * muncul beberapa kali; dipertahankan id terkecil — id yang dipakai data akademik (mahasiswa,
   * kurikulum, dll.). Master Jurusan & PMB tetap memakai `list` (per golongan kelas).
   */
  async listProdi(query: Parameters<typeof baseApi.list>[0] = {}) {
    const result = await baseApi.list({ ...query, limit: 200 });
    const seen = new Set<string>();
    const data = [...result.data]
      .sort((a, b) => a.id - b.id)
      .filter((j) => {
        const key = j.kodeProdi || `id:${j.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.namaJurusan.localeCompare(b.namaJurusan));
    return { ...result, data };
  },

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
