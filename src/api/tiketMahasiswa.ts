import { http } from './http';
import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';

export type JenisKebutuhanTiket = 'PERANGKAT_KOMPUTER' | 'JARINGAN_INTERNET' | 'SISTEM_INFORMASI' | 'KEBUTUHAN_DATA' | 'LAIN_LAIN';
export type StatusTiket = 'BARU' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';

export const JENIS_KEBUTUHAN_LABEL: Record<JenisKebutuhanTiket, string> = {
  PERANGKAT_KOMPUTER: 'Perangkat Komputer',
  JARINGAN_INTERNET: 'Jaringan & Internet',
  SISTEM_INFORMASI: 'Sistem Informasi',
  KEBUTUHAN_DATA: 'Kebutuhan Data',
  LAIN_LAIN: 'Lain-lain',
};

export const STATUS_TIKET_LABEL: Record<StatusTiket, string> = {
  BARU: 'Baru',
  DIPROSES: 'Diproses',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
};

export const STATUS_TIKET_VARIANT: Record<StatusTiket, 'success' | 'warning' | 'danger' | 'neutral'> = {
  BARU: 'neutral',
  DIPROSES: 'warning',
  SELESAI: 'success',
  DITOLAK: 'danger',
};

export interface TiketMahasiswa {
  id: number;
  nomorTiket: string | null;
  mahasiswaId: number;
  jenisKebutuhan: JenisKebutuhanTiket;
  uraian: string;
  status: StatusTiket;
  tanggapan: string | null;
  petugas?: { id: number; name: string } | null;
  tanggalDitanggapi: string | null;
  createdAt: string;
  mahasiswa?: { id: number; nim: string; namaLengkap: string; jurusan?: { namaJurusan: string } | null };
}

/** Modul SIM: petugas memproses tiket mahasiswa. */
export const simTiketMahasiswaApi = {
  async list(
    query?: ListQuery & { status?: string; jenisKebutuhan?: string }
  ): Promise<ListResult<TiketMahasiswa> & { ringkasan: Partial<Record<StatusTiket, number>> }> {
    const { data } = await http.get<
      ApiResponse<TiketMahasiswa[]> & { meta: ListResult<TiketMahasiswa>['meta'] & { ringkasan: Partial<Record<StatusTiket, number>> } }
    >('/sim/tiket-mahasiswa', { params: query });
    const { ringkasan, ...meta } = data.meta;
    return { data: data.data, meta, ringkasan };
  },
  async tanggapi(id: number, payload: { status: StatusTiket; tanggapan: string | null }): Promise<TiketMahasiswa> {
    const { data } = await http.put<ApiResponse<TiketMahasiswa>>(`/sim/tiket-mahasiswa/${id}/tanggapi`, payload);
    return data.data;
  },
};

/** Portal mahasiswa: ajukan & pantau tiket sendiri. */
export const mahasiswaTiketApi = {
  async list(): Promise<TiketMahasiswa[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<TiketMahasiswa[]>>('/mahasiswa-portal/tiket');
    return data.data;
  },
  async ajukan(payload: { jenisKebutuhan: JenisKebutuhanTiket; uraian: string }): Promise<{ message: string; data: TiketMahasiswa }> {
    const { data } = await mahasiswaHttp.post('/mahasiswa-portal/tiket', payload);
    return data;
  },
  async batalkan(id: number): Promise<void> {
    await mahasiswaHttp.delete(`/mahasiswa-portal/tiket/${id}`);
  },
};
