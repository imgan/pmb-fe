import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';
import type { PembayaranWisuda } from '@/types/entities';
import type { CicilanInput, CicilanTagihanData } from './tagihanKuliah';

export interface PembayaranWisudaPayload {
  nim: string;
  tanggalBayar: string;
  noBukti: string;
  bayar: number;
  kodeBank?: string | null;
}

export interface PembayaranWisudaListQuery extends ListQuery {
  mahasiswaId?: number | string;
}

/** Baris menu Pembayaran Wisuda: mahasiswa + status bayar & tahun lulus (dari Yudisium). */
export interface MahasiswaWisuda {
  id: number;
  nim: string;
  namaLengkap: string;
  tahunMasuk: number;
  jurusan: { namaJurusan: string } | null;
  tahunLulus: number | null;
  periode: string | null;
  tagihan: number;
  dibayar: number;
  sisa: number;
  status: StatusTagihanWisuda;
}

export type StatusTagihanWisuda = 'LUNAS' | 'SEBAGIAN' | 'BELUM' | 'BELUM_DITAGIH';

export interface HasilGenerateWisuda {
  pratinjau: boolean;
  cicilanDibuat: number;
  baru: number;
  diubah: number;
  sudahAda: number;
  jumlahTarget: number;
  /** Tagihan ditimpa yang sudah ada pembayarannya. */
  diubahSudahBayar: number;
  /** Sudah lunas, tidak ditimpa. */
  lunas: number;
  tarif: { id: number; kodeBiaya: string; keterangan: string | null; biaya: number };
}

export interface OpsiGenerateWisuda {
  tarif: { id: number; kodeBiaya: string; keterangan: string | null; biaya: number }[];
}

export interface OpsiTagihanWisuda {
  tahun: number;
  keterangan: string | null;
  total: number;
  dibayar: number;
  sisa: number;
  tagihanWisudaId: number;
  jumlahCicilan: number;
  cicilanLunas: number;
  cicilanBerikutnya: { cicilanKe: number; periode: string; sisa: number; tanggalJatuhTempo: string | null; terlambat: boolean } | null;
}

type MetaMahasiswaWisuda = PagingMeta & { tahunLulusOptions?: number[]; totalSisa?: number };

export interface MahasiswaWisudaQuery extends ListQuery {
  statusBayar?: StatusTagihanWisuda | 'TUNGGAKAN';
  /** Tahun, atau BELUM = belum yudisium. */
  tahunLulus?: number | 'BELUM';
}

interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: PagingMeta;
}

export const pembayaranWisudaApi = {
  async listMahasiswa(query: MahasiswaWisudaQuery = {}): Promise<{ data: MahasiswaWisuda[]; meta: MetaMahasiswaWisuda }> {
    const { data } = await http.get<ApiResponse<MahasiswaWisuda[]> & { meta: MetaMahasiswaWisuda }>('/keuangan/pembayaran-wisuda/mahasiswa', { params: query });
    return { data: data.data, meta: data.meta };
  },
  /** Pilihan popup Generate: tarif wisuda aktif. */
  async opsiGenerate(): Promise<OpsiGenerateWisuda> {
    const { data } = await http.get<ApiResponse<OpsiGenerateWisuda>>('/keuangan/pembayaran-wisuda/opsi-generate');
    return data.data;
  },
  /** Generate tagihan dari tarif terpilih untuk mahasiswa semester 5 ke atas; pratinjau = hanya menghitung. */
  async generate(body: { tarifLainId: number; pratinjau?: boolean; cicilan?: { jumlahBulan: number; bulanMulai: string; hariJatuhTempo?: number | null } | null }): Promise<HasilGenerateWisuda> {
    const { data } = await http.post<ApiResponse<HasilGenerateWisuda>>('/keuangan/pembayaran-wisuda/generate', body);
    return data.data;
  },
  async getCicilan(id: number): Promise<CicilanTagihanData> {
    const { data } = await http.get<ApiResponse<CicilanTagihanData>>(`/keuangan/pembayaran-wisuda/tagihan/${id}/cicilan`);
    return data.data;
  },
  /** Ganti seluruh jadwal cicilan; array kosong = hapus jadwal. */
  async saveCicilan(id: number, cicilan: CicilanInput[]): Promise<CicilanTagihanData> {
    const { data } = await http.put<ApiResponse<CicilanTagihanData>>(`/keuangan/pembayaran-wisuda/tagihan/${id}/cicilan`, { cicilan });
    return data.data;
  },
  /** Tagihan hasil generate milik satu mahasiswa + sisanya. */
  async opsiTagihan(mahasiswaId: number | string): Promise<OpsiTagihanWisuda[]> {
    const { data } = await http.get<ApiResponse<OpsiTagihanWisuda[]>>(`/keuangan/pembayaran-wisuda/mahasiswa/${mahasiswaId}/opsi-tagihan`);
    return data.data;
  },
  async list(query: PembayaranWisudaListQuery = {}): Promise<ListResult<PembayaranWisuda>> {
    const { data } = await http.get<ApiListResponse<PembayaranWisuda>>('/keuangan/pembayaran-wisuda', { params: query });
    return { data: data.data, meta: data.meta };
  },
  async create(payload: PembayaranWisudaPayload): Promise<PembayaranWisuda> {
    const { data } = await http.post<ApiResponse<PembayaranWisuda>>('/keuangan/pembayaran-wisuda', payload);
    return data.data;
  },
  /** Kwitansi PDF satu pembayaran. */
  async kwitansiPdf(id: number): Promise<Blob> {
    const { data } = await http.get(`/keuangan/pembayaran-wisuda/${id}/kwitansi`, { responseType: 'blob' });
    return data;
  },
  async remove(id: number | string): Promise<void> {
    await http.delete(`/keuangan/pembayaran-wisuda/${id}`);
  },
};
