import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse } from '@/types/common';
import type {
  JadwalKuliah,
  JenisSurat,
  KhsSemester,
  Krs,
  StatusMasukMahasiswa,
  SuratKeterangan,
  TahunAjaran,
  Transkrip,
} from '@/types/entities';

export interface SaveKrsDraftPayload {
  tahunAjaranId: number;
  jadwalKuliahIds: number[];
}

export interface SemesterBerjalan {
  semester: number;
  statusMasuk: StatusMasukMahasiswa;
  tahunAjaranAktif: TahunAjaran;
}

export const mahasiswaTahunAjaranApi = {
  async aktif(): Promise<TahunAjaran | null> {
    const { data } = await mahasiswaHttp.get<ApiResponse<TahunAjaran | null>>('/mahasiswa-portal/tahun-ajaran-aktif');
    return data.data;
  },
};

export const mahasiswaJadwalApi = {
  async listTersedia(params: { tahunAjaranId?: number; semester?: number } = {}): Promise<JadwalKuliah[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<JadwalKuliah[]>>('/mahasiswa-portal/jadwal-tersedia', {
      params,
    });
    return data.data;
  },
};

export interface KuotaSks {
  ipSemesterSebelumnya: number | null;
  maxSks: number | null;
}

export const mahasiswaSemesterApi = {
  async berjalan(): Promise<SemesterBerjalan> {
    const { data } = await mahasiswaHttp.get<ApiResponse<SemesterBerjalan>>('/mahasiswa-portal/semester-berjalan');
    return data.data;
  },
};

export const mahasiswaKrsApi = {
  async list(params: { tahunAjaranId?: number; semester?: number } = {}): Promise<Krs[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<Krs[]>>('/mahasiswa-portal/krs', { params });
    return data.data;
  },
  async kuota(semester: number): Promise<KuotaSks> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KuotaSks>>('/mahasiswa-portal/krs/kuota', {
      params: { semester },
    });
    return data.data;
  },
  async saveDraft(payload: SaveKrsDraftPayload): Promise<Krs> {
    const { data } = await mahasiswaHttp.put<ApiResponse<Krs>>('/mahasiswa-portal/krs', payload);
    return data.data;
  },
  async ajukan(id: number): Promise<Krs> {
    const { data } = await mahasiswaHttp.post<ApiResponse<Krs>>(`/mahasiswa-portal/krs/${id}/ajukan`);
    return data.data;
  },
};

export const mahasiswaNilaiApi = {
  async list(params: { semester?: number } = {}): Promise<KhsSemester[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KhsSemester[]>>('/mahasiswa-portal/nilai', { params });
    return data.data;
  },
  async transkrip(): Promise<Transkrip> {
    const { data } = await mahasiswaHttp.get<ApiResponse<Transkrip>>('/mahasiswa-portal/transkrip');
    return data.data;
  },
};

export interface CreateSuratRequestPayload {
  jenisSurat: JenisSurat;
  semester?: number | null;
  alasan?: string | null;
  namaInstansi?: string | null;
  alamatInstansi?: string | null;
  ipk?: number | null;
  jumlahSks?: number | null;
  namaKoordinator?: string | null;
  noHpKoordinator?: string | null;
  tanggalUjianMulai?: string | null;
  tanggalUjianSelesai?: string | null;
}

export const mahasiswaSuratKeteranganApi = {
  async list(): Promise<SuratKeterangan[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<SuratKeterangan[]>>('/mahasiswa-portal/surat-keterangan');
    return data.data;
  },
  async create(payload: CreateSuratRequestPayload): Promise<SuratKeterangan> {
    const { data } = await mahasiswaHttp.post<ApiResponse<SuratKeterangan>>('/mahasiswa-portal/surat-keterangan', payload);
    return data.data;
  },
  async cetakPdf(id: number): Promise<Blob> {
    const { data } = await mahasiswaHttp.get(`/mahasiswa-portal/surat-keterangan/${id}/pdf`, { responseType: 'blob' });
    return data;
  },
};
