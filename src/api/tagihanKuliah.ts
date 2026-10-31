import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type {
  GenerateTagihanResult,
  ImportTagihanBatch,
  ImportTagihanRow,
  ImportTagihanSummary,
  ImportVaRow,
  TagihanCicilan,
  TagihanKuliah,
  VirtualAccountMahasiswa,
} from '@/types/entities';

export interface CicilanTagihanData {
  tagihan: {
    id: number;
    semester: number;
    tahunAjaran: string | null;
    mahasiswa: { id: number; nim: string; namaLengkap: string };
    noVirtualAccount: string | null;
    tanggalJatuhTempo: string | null;
    totalTagihan: number;
    totalDibayar: number;
    sisaTagihan: number;
  };
  cicilan: TagihanCicilan[];
}

export interface CicilanInput {
  periode: string;
  nominal: number;
  tanggalJatuhTempo: string | null;
  noVirtualAccount: string | null;
  keterangan?: string | null;
}

export interface GenerateCicilanPayload {
  tahunAjaranId: number;
  jurusanId?: number | null;
  jumlahBulan: number;
  /** YYYY-MM */
  bulanMulai: string;
  hariJatuhTempo?: number | null;
  timpa?: boolean;
}

export interface RiwayatPembayaranMahasiswa {
  mahasiswa: {
    id: number;
    nim: string;
    namaLengkap: string;
    tahunMasuk: number | null;
    jurusan?: { namaJurusan: string } | null;
    golonganKelas?: { namaKelas: string } | null;
  };
  ringkasan: { totalTagihan: number; totalPotongan: number; totalDibayar: number; totalSisa: number };
  semester: {
    id: number;
    periode: string;
    semester: number;
    tagihanAwal: number;
    potongan: number;
    totalTagihan: number;
    dibayarImport: number;
    dibayarTransaksi: number;
    totalDibayar: number;
    sisa: number;
    status: 'LUNAS' | 'SEBAGIAN' | 'BELUM_BAYAR';
    importedAt: string | null;
    tanggalJatuhTempo: string | null;
    noVirtualAccount: string | null;
    keterangan: string | null;
    transaksi: {
      id: number;
      tanggalBayar: string;
      noBukti: string;
      nominal: number;
      kodeBank: string | null;
      keterangan: string | null;
      /** false = transaksi sebelum import terakhir (sudah termasuk di "dibayar import"). */
      terhitung: boolean;
    }[];
  }[];
}

export const tagihanKuliahApi = {
  async getCicilan(id: number): Promise<CicilanTagihanData> {
    const { data } = await http.get<ApiResponse<CicilanTagihanData>>(`/keuangan/generate-tagihan/${id}/cicilan`);
    return data.data;
  },
  /** Ganti seluruh cicilan satu tagihan; array kosong = hapus cicilan. */
  async saveCicilan(id: number, cicilan: CicilanInput[]): Promise<CicilanTagihanData> {
    const { data } = await http.put<ApiResponse<CicilanTagihanData>>(`/keuangan/generate-tagihan/${id}/cicilan`, { cicilan });
    return data.data;
  },
  async generateCicilan(payload: GenerateCicilanPayload): Promise<{ message: string; data: { totalTagihan: number; dibuat: number; dilewati: number } }> {
    const { data } = await http.post('/keuangan/generate-tagihan/cicilan/generate', payload);
    return data;
  },
  async list(query?: ListQuery): Promise<ListResult<TagihanKuliah>> {
    const { data } = await http.get<ApiResponse<TagihanKuliah[]> & { meta: ListResult<TagihanKuliah>['meta'] }>(
      '/keuangan/generate-tagihan',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  /** Export Excel dengan filter yang sama seperti daftar. */
  async exportExcel(query?: { tahunAjaranIds?: number[]; search?: string; status?: string }): Promise<Blob> {
    const { tahunAjaranIds, ...rest } = query ?? {};
    const params = { ...rest, tahunAjaranId: tahunAjaranIds?.length ? tahunAjaranIds.join(',') : undefined };
    const { data } = await http.get('/keuangan/generate-tagihan/export', { params, responseType: 'blob' });
    return data;
  },
  async riwayatMahasiswa(mahasiswaId: number): Promise<RiwayatPembayaranMahasiswa> {
    const { data } = await http.get<ApiResponse<RiwayatPembayaranMahasiswa>>(`/keuangan/generate-tagihan/riwayat-mahasiswa/${mahasiswaId}`);
    return data.data;
  },
  async update(
    id: number,
    payload: {
      tagihanAwal?: number;
      totalBayarImport?: number;
      tanggalJatuhTempo?: string | null;
      noVirtualAccount?: string | null;
      keterangan?: string | null;
    }
  ): Promise<TagihanKuliah> {
    const { data } = await http.put<ApiResponse<TagihanKuliah>>(`/keuangan/generate-tagihan/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/keuangan/generate-tagihan/${id}`);
  },
  async generate(tahunAjaranId: number): Promise<GenerateTagihanResult> {
    const { data } = await http.post<ApiResponse<GenerateTagihanResult>>('/keuangan/generate-tagihan/generate', {
      tahunAjaranId,
    });
    return data.data;
  },
  /** Validasi file & bandingkan dengan tagihan yang ada, tanpa menyimpan. */
  async importPreview(file: string): Promise<{ summary: ImportTagihanSummary; rows: ImportTagihanRow[] }> {
    const { data } = await http.post<ApiResponse<{ summary: ImportTagihanSummary; rows: ImportTagihanRow[] }>>(
      '/keuangan/generate-tagihan/import/preview',
      { file }
    );
    return data.data;
  },
  async importCommit(file: string, fileName?: string | null): Promise<{ batchId: number; status: string; summary: ImportTagihanSummary }> {
    const { data } = await http.post<ApiResponse<{ batchId: number; status: string; summary: ImportTagihanSummary }>>(
      '/keuangan/generate-tagihan/import',
      { file, fileName }
    );
    return data.data;
  },
  async importVaPreview(file: string): Promise<{ summary: ImportTagihanSummary; rows: ImportVaRow[] }> {
    const { data } = await http.post<ApiResponse<{ summary: ImportTagihanSummary; rows: ImportVaRow[] }>>(
      '/keuangan/generate-tagihan/import-va/preview',
      { file }
    );
    return data.data;
  },
  async importVaCommit(file: string): Promise<{ summary: ImportTagihanSummary; rows: ImportVaRow[] }> {
    const { data } = await http.post<ApiResponse<{ summary: ImportTagihanSummary; rows: ImportVaRow[] }>>(
      '/keuangan/generate-tagihan/import-va',
      { file }
    );
    return data.data;
  },
  async importVaTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/generate-tagihan/import-va/template', { responseType: 'blob' });
    return data;
  },
  async vaMahasiswa(mahasiswaId: number): Promise<VirtualAccountMahasiswa[]> {
    const { data } = await http.get<ApiResponse<VirtualAccountMahasiswa[]>>(`/keuangan/generate-tagihan/va-mahasiswa/${mahasiswaId}`);
    return data.data;
  },
  async importTemplate(): Promise<Blob> {
    const { data } = await http.get('/keuangan/generate-tagihan/import/template', { responseType: 'blob' });
    return data;
  },
  async importRiwayat(query?: ListQuery): Promise<ListResult<ImportTagihanBatch>> {
    const { data } = await http.get<ApiResponse<ImportTagihanBatch[]> & { meta: ListResult<ImportTagihanBatch>['meta'] }>(
      '/keuangan/generate-tagihan/import/riwayat',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async importRiwayatDetail(id: number): Promise<ImportTagihanBatch> {
    const { data } = await http.get<ApiResponse<ImportTagihanBatch>>(`/keuangan/generate-tagihan/import/riwayat/${id}`);
    return data.data;
  },
  async cariByNim(nim: string, tahunAjaranId?: number): Promise<TagihanKuliah[]> {
    const { data } = await http.get<ApiResponse<TagihanKuliah[]>>('/keuangan/generate-tagihan/cari', {
      params: { nim, tahunAjaranId },
    });
    return data.data;
  },
};
