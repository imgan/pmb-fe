import { http } from './http';
import type { ApiResponse } from '@/types/common';
import { filenameFromDisposition, type NamedBlob } from '@/utils/download';

export type KategoriKalender =
  | 'KKN'
  | 'PKL'
  | 'PENELITIAN'
  | 'PERKULIAHAN'
  | 'PEMBAYARAN'
  | 'YUDISIUM'
  | 'WISUDA'
  | 'LIBUR_AKADEMIK'
  | 'LIBUR_NASIONAL'
  | 'PENERIMAAN_MAHASISWA_BARU'
  | 'ORIENTASI_MAHASISWA'
  | 'SEMINAR_PROPOSAL'
  | 'SEMINAR_HASIL'
  | 'REGISTRASI'
  | 'UJIAN'
  | 'LAINNYA';

/** Kategori kegiatan & warnanya (urutan tetap; warna selalu disertai label). Sama dengan validasi backend. */
export const KATEGORI_KALENDER: { value: KategoriKalender; label: string; color: string }[] = [
  { value: 'KKN', label: 'KKN', color: '#FF0080' },
  { value: 'PKL', label: 'PKL', color: '#A8A83C' },
  { value: 'PENELITIAN', label: 'Penelitian', color: '#6600CC' },
  { value: 'PERKULIAHAN', label: 'Perkuliahan', color: '#FF8000' },
  { value: 'PEMBAYARAN', label: 'Pembayaran', color: '#FF0000' },
  { value: 'YUDISIUM', label: 'Yudisium', color: '#B300B3' },
  { value: 'WISUDA', label: 'Wisuda', color: '#9933FF' },
  { value: 'LIBUR_AKADEMIK', label: 'Libur Akademik', color: '#800000' },
  { value: 'LIBUR_NASIONAL', label: 'Libur Nasional', color: '#3D7F7F' },
  { value: 'PENERIMAAN_MAHASISWA_BARU', label: 'Penerimaan Mahasiswa Baru', color: '#00FFFF' },
  { value: 'ORIENTASI_MAHASISWA', label: 'Orientasi Mahasiswa', color: '#A0675A' },
  { value: 'SEMINAR_PROPOSAL', label: 'Seminar Proposal', color: '#00FF00' },
  { value: 'SEMINAR_HASIL', label: 'Seminar Hasil', color: '#000000' },
  { value: 'REGISTRASI', label: 'Registrasi / KRS', color: '#2A78D6' },
  { value: 'UJIAN', label: 'Ujian', color: '#1BAF7A' },
  { value: 'LAINNYA', label: 'Lainnya', color: '#A3A29C' },
];

/** Warna teks yang terbaca di atas warna kategori (hitam untuk warna terang, putih untuk gelap). */
export const warnaTeksKategori = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return l > 0.4 ? '#000000' : '#FFFFFF';
};

export interface KegiatanKalender {
  id: number;
  tahunAjaranId: number;
  namaKegiatan: string;
  kategori: KategoriKalender;
  /** YYYY-MM-DD */
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string | null;
}

export type KegiatanKalenderPayload = Omit<KegiatanKalender, 'id'>;

export const KATEGORI_BY = Object.fromEntries(KATEGORI_KALENDER.map((k) => [k.value, k])) as Record<
  KategoriKalender,
  (typeof KATEGORI_KALENDER)[number]
>;

// ---- Utilitas tanggal (string YYYY-MM-DD, tanpa zona waktu) ----
export const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const pad2 = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const tanggalPanjang = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${NAMA_BULAN[m - 1]} ${y}`;
};
export const rentangTanggal = (k: Pick<KegiatanKalender, 'tanggalMulai' | 'tanggalSelesai'>) =>
  k.tanggalMulai === k.tanggalSelesai ? tanggalPanjang(k.tanggalMulai) : `${tanggalPanjang(k.tanggalMulai)} – ${tanggalPanjang(k.tanggalSelesai)}`;
const utc = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const durasiHari = (k: Pick<KegiatanKalender, 'tanggalMulai' | 'tanggalSelesai'>) =>
  Math.round((utc(k.tanggalSelesai) - utc(k.tanggalMulai)) / 86400000) + 1;

/** BAAK → Kalender Akademik. */
export const kalenderAkademikApi = {
  async list(query: { tahunAjaranId?: number; kategori?: string }): Promise<KegiatanKalender[]> {
    const { data } = await http.get<ApiResponse<KegiatanKalender[]>>('/kalender-akademik', { params: query });
    return data.data;
  },
  async create(payload: KegiatanKalenderPayload): Promise<KegiatanKalender> {
    const { data } = await http.post<ApiResponse<KegiatanKalender>>('/kalender-akademik', payload);
    return data.data;
  },
  async update(id: number, payload: Partial<KegiatanKalenderPayload>): Promise<KegiatanKalender> {
    const { data } = await http.put<ApiResponse<KegiatanKalender>>(`/kalender-akademik/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/kalender-akademik/${id}`);
  },
  async exportExcel(query: { tahunAjaranId?: number; kategori?: string }): Promise<NamedBlob> {
    const res = await http.get('/kalender-akademik/export', { params: query, responseType: 'blob' });
    return { blob: res.data, filename: filenameFromDisposition(res.headers['content-disposition'], 'kalender-akademik.xlsx') };
  },
  async pdf(query: { tahunAjaranId?: number; kategori?: string }): Promise<Blob> {
    const { data } = await http.get('/kalender-akademik/pdf', { params: query, responseType: 'blob' });
    return data;
  },
};
