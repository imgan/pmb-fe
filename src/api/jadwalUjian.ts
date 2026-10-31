import { http } from './http';
import { dosenHttp } from './dosenHttp';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';

export type JenisUjian = 'UTS' | 'UAS';
export type StatusUjian = 'ONLINE' | 'OFFLINE';

/** Satu kelas (jadwal kuliah dari BAAK) + isian jadwal ujiannya untuk jenis ujian terpilih. */
export interface JadwalUjianRow {
  jadwalKuliahId: number;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  kelas: string;
  semester: number | null;
  nidnDosen: string | null;
  dosen: string | null;
  ruangan: string | null;
  jamKe: number | null;
  pengawas: string;
  tahunAjaran: string | null;
  status: StatusUjian | null;
  sifat: string | null;
  tanggal: string | null;
}

export interface JadwalUjianList extends ListResult<JadwalUjianRow> {
  jenisUjian: JenisUjian;
  tahunAjaran: { id: number; label: string } | null;
  sifatOptions: string[];
}

export interface SimpanJadwalUjianPayload {
  jenisUjian: JenisUjian;
  status: StatusUjian | null;
  sifat: string | null;
  tanggal: string | null;
}

type ListResponse = ApiResponse<{ items: JadwalUjianRow[]; jenisUjian: JenisUjian; tahunAjaran: JadwalUjianList['tahunAjaran']; sifatOptions: string[] }> & {
  meta: PagingMeta;
};
const toList = (body: ListResponse): JadwalUjianList => ({ ...body.data, data: body.data.items, meta: body.meta });

export interface JadwalUjianApi {
  list(query: ListQuery): Promise<JadwalUjianList>;
  simpan(jadwalKuliahId: number, payload: SimpanJadwalUjianPayload): Promise<void>;
  exportExcel?(query: ListQuery): Promise<Blob>;
}

/** Prodi → Jadwal Kuliah → Jadwal Ujian (dibatasi ke prodi sesi di backend). */
export const jadwalUjianApi: JadwalUjianApi = {
  async list(query) {
    const { data } = await http.get<ListResponse>('/prodi/jadwal-ujian', { params: query });
    return toList(data);
  },
  async simpan(jadwalKuliahId, payload) {
    await http.put(`/prodi/jadwal-ujian/${jadwalKuliahId}`, payload);
  },
  async exportExcel(query) {
    const { data } = await http.get('/prodi/jadwal-ujian/export', { params: query, responseType: 'blob' });
    return data;
  },
};

/** Portal dosen: hanya kelas yang diampu; tahun akademik dari Setting Tahun Akademik dosen. */
export const dosenJadwalUjianApi: JadwalUjianApi = {
  async list(query) {
    const { data } = await dosenHttp.get<ListResponse>('/dosen-portal/jadwal-ujian', { params: query });
    return toList(data);
  },
  async simpan(jadwalKuliahId, payload) {
    await dosenHttp.put(`/dosen-portal/jadwal-ujian/${jadwalKuliahId}`, payload);
  },
};
