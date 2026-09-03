import { dosenHttp } from './dosenHttp';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type {
  DosenPortalJadwal,
  PresensiMahasiswaRow,
  RealisasiMengajar,
  RekapMahasiswaRow,
  SavePresensiMahasiswaItem,
  SilabusMatakuliahRow,
} from '@/types/entities';

export interface RealisasiMengajarPayload {
  jadwalKuliahId: number;
  tanggalRealisasi: string;
  jamMasuk: string;
  jamKeluar: string;
  pertemuanKe: number;
  status: RealisasiMengajar['status'];
  keterangan?: string | null;
}

export const dosenJadwalApi = {
  async listMine(): Promise<DosenPortalJadwal[]> {
    const { data } = await dosenHttp.get<ApiResponse<DosenPortalJadwal[]>>('/dosen-portal/jadwal');
    return data.data;
  },
};

export const dosenRealisasiApi = {
  async list(query: ListQuery): Promise<ListResult<RealisasiMengajar>> {
    const { data } = await dosenHttp.get<ApiResponse<RealisasiMengajar[]> & { meta: ListResult<RealisasiMengajar>['meta'] }>(
      '/dosen-portal/realisasi',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async create(payload: RealisasiMengajarPayload): Promise<RealisasiMengajar> {
    const { data } = await dosenHttp.post<ApiResponse<RealisasiMengajar>>('/dosen-portal/realisasi', payload);
    return data.data;
  },
  async remove(id: number | string): Promise<void> {
    await dosenHttp.delete(`/dosen-portal/realisasi/${id}`);
  },
};

export const dosenPresensiApi = {
  async get(realisasiId: number | string): Promise<PresensiMahasiswaRow[]> {
    const { data } = await dosenHttp.get<ApiResponse<PresensiMahasiswaRow[]>>(`/dosen-portal/realisasi/${realisasiId}/presensi`);
    return data.data;
  },
  async save(realisasiId: number | string, items: SavePresensiMahasiswaItem[]): Promise<PresensiMahasiswaRow[]> {
    const { data } = await dosenHttp.put<ApiResponse<PresensiMahasiswaRow[]>>(`/dosen-portal/realisasi/${realisasiId}/presensi`, {
      items,
    });
    return data.data;
  },
};

export const dosenRekapMahasiswaApi = {
  async list(query: ListQuery & { jadwalKuliahId: number }): Promise<ListResult<RekapMahasiswaRow>> {
    const { data } = await dosenHttp.get<ApiResponse<RekapMahasiswaRow[]> & { meta: ListResult<RekapMahasiswaRow>['meta'] }>(
      '/dosen-portal/rekap-mahasiswa',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
};

export const dosenSilabusApi = {
  async list(): Promise<SilabusMatakuliahRow[]> {
    const { data } = await dosenHttp.get<ApiResponse<SilabusMatakuliahRow[]>>('/dosen-portal/mata-kuliah');
    return data.data;
  },
};
