import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
import type { PembayaranTaSkripsi } from '@/types/entities';
import type { CicilanInput, CicilanTagihanData } from './tagihanKuliah';

/** Tagihan ditentukan server dari hasil Generate Tagihan; `periode` diabaikan (dipertahankan untuk form Pembayaran Kuliah). */
export interface PembayaranTaSkripsiPayload {
  mahasiswaId: number;
  periode?: number | null;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank?: string | null;
  keterangan?: string | null;
}

export interface PembayaranTaSkripsiListQuery extends ListQuery {
  mahasiswaId?: number | string;
}

export type StatusTagihanTa = 'LUNAS' | 'LEBIH_BAYAR' | 'SEBAGIAN' | 'BELUM' | 'BELUM_DITAGIH';

/** Baris menu Pembayaran TA/Skripsi: mahasiswa + status tagihan. */
export interface MahasiswaTa {
  id: number;
  nim: string;
  namaLengkap: string;
  tahunMasuk: number;
  jurusan: { namaJurusan: string } | null;
  periode: string | null;
  tagihan: number;
  dibayar: number;
  sisa: number;
  /** Dibayar melebihi tagihan (mis. setelah tarif diturunkan). */
  lebihBayar: number;
  status: StatusTagihanTa;
}

export interface MahasiswaTaQuery extends ListQuery {
  statusBayar?: StatusTagihanTa | 'TUNGGAKAN';
}

export interface OpsiGenerateTa {
  tahun: { id: number; nama: string; isActive: boolean; periode: number; tarif: { kodeProdi: string | null; prodi: string; biaya: number }[] }[];
}

export interface HasilGenerateTa {
  pratinjau: boolean;
  cicilanDibuat: number;
  baru: number;
  diubah: number;
  sudahAda: number;
  jumlahTarget: number;
  /** Mahasiswa semester 5+ yang prodinya belum punya tarif di tahun ini (dilewati). */
  tanpaTarif: number;
  /** Tagihan ditimpa yang sudah ada pembayarannya. */
  diubahSudahBayar: number;
  /** Sudah lunas, tidak ditimpa. */
  lunas: number;
  tahun: { id: number; nama: string };
  tarif: { prodi: string; biaya: number; jumlah: number }[];
}

export interface OpsiTagihanTa {
  tagihanTaSkripsiId: number;
  periode: number;
  keterangan: string | null;
  total: number;
  dibayar: number;
  sisa: number;
  lebihBayar: number;
  jumlahCicilan: number;
  cicilanLunas: number;
  cicilanBerikutnya: { cicilanKe: number; periode: string; sisa: number; tanggalJatuhTempo: string | null; terlambat: boolean } | null;
}

type MetaMahasiswaTa = PagingMeta & { totalSisa?: number };

interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: PagingMeta;
}

const BASE = '/keuangan/pembayaran-ta-skripsi';

export const pembayaranTaSkripsiApi = {
  async listMahasiswa(query: MahasiswaTaQuery = {}): Promise<{ data: MahasiswaTa[]; meta: MetaMahasiswaTa }> {
    const { data } = await http.get<ApiResponse<MahasiswaTa[]> & { meta: MetaMahasiswaTa }>(`${BASE}/mahasiswa`, { params: query });
    return { data: data.data, meta: data.meta };
  },
  /** Pilihan popup Generate: Tahun TA/Skripsi yang punya tarif aktif + tarif per prodi. */
  async opsiGenerate(): Promise<OpsiGenerateTa> {
    const { data } = await http.get<ApiResponse<OpsiGenerateTa>>(`${BASE}/opsi-generate`);
    return data.data;
  },
  /** Generate tagihan untuk mahasiswa semester 5 ke atas; pratinjau = hanya menghitung. */
  async generate(body: { tahunTaSkripsiId: number; pratinjau?: boolean; cicilan?: { jumlahBulan: number; bulanMulai: string; hariJatuhTempo?: number | null } | null }): Promise<HasilGenerateTa> {
    const { data } = await http.post<ApiResponse<HasilGenerateTa>>(`${BASE}/generate`, body);
    return data.data;
  },
  async getCicilan(id: number): Promise<CicilanTagihanData> {
    const { data } = await http.get<ApiResponse<CicilanTagihanData>>(`${BASE}/tagihan/${id}/cicilan`);
    return data.data;
  },
  /** Ganti seluruh jadwal cicilan; array kosong = hapus jadwal. */
  async saveCicilan(id: number, cicilan: CicilanInput[]): Promise<CicilanTagihanData> {
    const { data } = await http.put<ApiResponse<CicilanTagihanData>>(`${BASE}/tagihan/${id}/cicilan`, { cicilan });
    return data.data;
  },
  /** Tagihan hasil generate milik satu mahasiswa + sisanya. */
  async opsiTagihan(mahasiswaId: number | string): Promise<OpsiTagihanTa[]> {
    const { data } = await http.get<ApiResponse<OpsiTagihanTa[]>>(`${BASE}/mahasiswa/${mahasiswaId}/opsi-tagihan`);
    return data.data;
  },
  async list(query: PembayaranTaSkripsiListQuery = {}): Promise<ListResult<PembayaranTaSkripsi>> {
    const { data } = await http.get<ApiListResponse<PembayaranTaSkripsi>>(BASE, { params: query });
    return { data: data.data, meta: data.meta };
  },
  async create(payload: PembayaranTaSkripsiPayload): Promise<PembayaranTaSkripsi> {
    const { data } = await http.post<ApiResponse<PembayaranTaSkripsi>>(BASE, payload);
    return data.data;
  },
  /** Kwitansi PDF satu pembayaran. */
  async kwitansiPdf(id: number): Promise<Blob> {
    const { data } = await http.get(`${BASE}/${id}/kwitansi`, { responseType: 'blob' });
    return data;
  },
  async remove(id: number | string): Promise<void> {
    await http.delete(`${BASE}/${id}`);
  },
};
