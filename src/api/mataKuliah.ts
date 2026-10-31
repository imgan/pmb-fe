import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse, ImportResult } from '@/types/common';
import type { MataKuliah, KelompokMataKuliah, KelompokKurikulum, JenisMataKuliah, KelompokKompetensi } from '@/types/entities';

/** Mata kuliah selalu milik satu kurikulum (kurikulumId). */
export interface MataKuliahPayload {
  kurikulumId: number;
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
  idMatkul?: string | null;
  semester?: number | null;
  isObe?: boolean;
  targetCpl?: number | null;
  targetCpmk?: number | null;
  silabus?: string | null;
  /** Kunci tema ikon ilustrasi E-learning; null = otomatis. */
  ikon?: string | null;
}

const baseApi = createCrudApi<MataKuliah, MataKuliahPayload, Partial<MataKuliahPayload>>('mata-kuliah');

export const mataKuliahApi = {
  ...baseApi,
  /** Export Excel format Neo Feeder (filter kurikulumId / jurusanId / tahunKurikulum). */
  async exportExcel(params: { kurikulumId?: number; jurusanId?: number; tahunKurikulum?: number } = {}): Promise<Blob> {
    const { data } = await http.get('/mata-kuliah/export', { params, responseType: 'blob' });
    return data;
  },
  /** Import: kurikulum dari Kode Prodi + Kurikulum (dibuat otomatis) atau semua ke kurikulumId. */
  async importExcel(file: string, kurikulumId?: number | null): Promise<ImportResult> {
    const { data } = await http.post<ApiResponse<ImportResult>>('/mata-kuliah/import', { file, kurikulumId: kurikulumId ?? null });
    return data.data;
  },
  /** Setting Kurikulum: OBE + target CPL/CPMK banyak MK satu kurikulum sekaligus. */
  async settingKurikulum(
    kurikulumId: number,
    items: { id: number; isObe: boolean; targetCpl: number | null; targetCpmk: number | null }[]
  ): Promise<{ updated: number }> {
    const { data } = await http.put<ApiResponse<{ updated: number }>>('/mata-kuliah/setting-kurikulum', { kurikulumId, items });
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/mata-kuliah/import-template', { responseType: 'blob' });
    return data;
  },
};
