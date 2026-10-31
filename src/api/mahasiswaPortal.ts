import { mahasiswaHttp } from './mahasiswaHttp';
import { filenameFromDisposition, type NamedBlob } from '@/utils/download';
import type { ApiResponse } from '@/types/common';
import type { MahasiswaBiodataPayload } from './mahasiswa';
import type {
  JadwalKuliah,
  JenisSurat,
  KhsSemester,
  Krs,
  MahasiswaBiodata,
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

export interface StatusAksesAkademik {
  aktif: boolean;
  /** Minimal persen yang sudah dibayar (0–100). */
  minBayar: number;
  /** Nominal (Rp) yang wajib sudah dibayar semester ini untuk jenis ini. */
  target: number;
  diizinkan: boolean;
  pesan: string | null;
}

export interface AksesAkademik {
  totalTunggakan: number;
  /** Total "nilai yang akan dibayar" dari keringanan yang disetujui. */
  keringanan: number;
  tunggakanEfektif: number;
  totalKewajiban: number;
  persenTunggakan: number;
  persenDibayar: number;
  /** Tagihan semester berjalan (dicicil jumlahCicilan x per bulan). */
  tagihanSemester: number;
  dibayarSemester: number;
  /** Tunggakan semester sebelumnya / TA-Skripsi / biaya lain / manual (setelah keringanan). */
  tunggakanLain: number;
  jumlahCicilan: number;
  cicilanPerBulan: number;
  bulanKe: number;
  krs: StatusAksesAkademik;
  uts: StatusAksesAkademik;
  nilai: StatusAksesAkademik;
}

/** Status alur cekal (konfigurasi Keuangan per prodi) untuk isi KRS, ikut UTS & lihat nilai. */
export const mahasiswaAksesAkademikApi = {
  async get(): Promise<AksesAkademik> {
    const { data } = await mahasiswaHttp.get<ApiResponse<AksesAkademik>>('/mahasiswa-portal/akses-akademik');
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

export interface KtmData {
  nim: string;
  namaLengkap: string;
  programStudi: string | null;
  jenjangPendidikan: string | null;
  kelas: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: 'L' | 'P' | null;
  alamat: string | null;
  tahunMasuk: number;
  berlakuHingga: string;
  photo: string | null;
  kampus: {
    namaKampus: string;
    alamat: string | null;
    telepon: string | null;
    email: string | null;
    logoUrl: string | null;
  } | null;
}

export const mahasiswaKtmApi = {
  async get(): Promise<KtmData> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KtmData>>('/mahasiswa-portal/ktm');
    return data.data;
  },
  async cetakPdf(): Promise<Blob> {
    const { data } = await mahasiswaHttp.get('/mahasiswa-portal/ktm/pdf', { responseType: 'blob' });
    return data;
  },
};

export const mahasiswaNilaiApi = {
  async list(params: { semester?: number } = {}): Promise<KhsSemester[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KhsSemester[]>>('/mahasiswa-portal/nilai', { params });
    return data.data;
  },
  /** `semester: 'semua'` = KHS seluruh semester digabung jadi satu tabel (urut semester terkecil). */
  async cetakKhsPdf(semester: number | 'semua'): Promise<Blob> {
    const { data } = await mahasiswaHttp.get('/mahasiswa-portal/nilai/khs-pdf', {
      params: { semester },
      responseType: 'blob',
    });
    return data;
  },
  /** MK yang belum selesai / harus diulang (nilai diakui di bawah C). */
  async mengulang(): Promise<MatakuliahMengulang[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<MatakuliahMengulang[]>>('/mahasiswa-portal/mengulang');
    return data.data;
  },
  async transkrip(): Promise<Transkrip> {
    const { data } = await mahasiswaHttp.get<ApiResponse<Transkrip>>('/mahasiswa-portal/transkrip');
    return data.data;
  },
};

export type StatusMkKurikulum = 'LULUS' | 'MENGULANG' | 'BELUM';

export interface KurikulumMahasiswa {
  tahunKurikulumOptions: number[];
  tahunKurikulum: number | null;
  semester: {
    semester: number | null;
    totalSks: number;
    mataKuliah: {
      kode: string;
      mataKuliah: string;
      jenisMataKuliah: 'TEORI' | 'PRAKTIK' | 'TEORI_PRAKTIK' | null;
      wajib: boolean;
      sksTeori: number;
      sksPraktek: number;
      sksTotal: number;
      status: StatusMkKurikulum;
      grade: string | null;
    }[];
  }[];
  ringkasan: { totalSks: number; sksLulus: number };
}

export interface RekapKehadiranMahasiswa {
  tahunAjaranOptions: { id: number; label: string; semester: number }[];
  tahunAjaranId: number | null;
  mataKuliah: {
    jadwalKuliahId: number;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    kelas: string;
    sks: number | null;
    dosen: string | null;
    pertemuan: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    belumTercatat: number;
    persen: number | null;
  }[];
  ringkasan: { pertemuan: number; hadir: number; persen: number | null } | null;
}

export interface KartuBimbingan {
  pengajuanId: number;
  mahasiswa: { nim: string; namaLengkap: string; prodi: string | null; jenjang: string | null };
  judul: string;
  pembimbingUtama: string | null;
  pembimbingPendamping: string | null;
  tanggalAwal: string | null;
  tanggalAkhir: string | null;
  catatan: {
    id: number;
    tanggal: string;
    pokokPembahasan: string;
    keterangan: string | null;
    tanggalInput: string;
    dosenId: number;
    pembimbing: string | null;
  }[];
}

/** Menu "Data Kampus" portal mahasiswa. */
export const mahasiswaDataKampusApi = {
  async kurikulum(tahunKurikulum?: number | null): Promise<KurikulumMahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KurikulumMahasiswa>>('/mahasiswa-portal/data-kampus/kurikulum', {
      params: tahunKurikulum ? { tahunKurikulum } : {},
    });
    return data.data;
  },
  async kehadiran(tahunAjaranId?: number | null): Promise<RekapKehadiranMahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<RekapKehadiranMahasiswa>>('/mahasiswa-portal/data-kampus/kehadiran', {
      params: tahunAjaranId ? { tahunAjaranId } : {},
    });
    return data.data;
  },
  /** Kartu bimbingan TA/Skripsi (null = pengajuan TA belum disetujui). */
  async bimbingan(): Promise<KartuBimbingan | null> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KartuBimbingan | null>>('/mahasiswa-portal/data-kampus/bimbingan');
    return data.data;
  },
  async dosen(): Promise<InformasiDosen[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<InformasiDosen[]>>('/mahasiswa-portal/data-kampus/dosen');
    return data.data;
  },
};

export interface InformasiDosen {
  id: number;
  namaLengkap: string;
  gelar: string | null;
  nidn: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  telpHp: string | null;
  noWhatsapp: string | null;
  email: string | null;
  alamat: string | null;
  pendidikanAkhir: string | null;
  jenisDosen: 'INTERNAL' | 'EKSTERNAL';
  prodi: string | null;
}

export interface PengumumanMahasiswa {
  id: number;
  judul: string;
  isi: string;
  tanggalTerbit: string;
  tanggalBerakhir: string | null;
  isPenting: boolean;
  jurusan: { id: number; namaJurusan: string } | null;
}

/** Pengumuman BAAK yang sedang tayang untuk mahasiswa yang login. */
export const mahasiswaPengumumanApi = {
  async list(): Promise<PengumumanMahasiswa[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<PengumumanMahasiswa[]>>('/mahasiswa-portal/pengumuman');
    return data.data;
  },
};

export interface MatakuliahMengulang {
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number;
  semester: number;
  nilai: number | null;
  grade: string;
  /** Sudah diambil lagi di KRS tahun ajaran aktif. */
  sedangDiulang: boolean;
}

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
  async cetakPdf(id: number): Promise<NamedBlob> {
    const { data, headers } = await mahasiswaHttp.get(`/mahasiswa-portal/surat-keterangan/${id}/pdf`, {
      responseType: 'blob',
    });
    return { blob: data, filename: filenameFromDisposition(headers['content-disposition'], `surat-${id}.pdf`) };
  },
};

/** Biodata lengkap milik mahasiswa login. Field terkunci (kelas, data pendaftaran, prodi, status) diabaikan backend. */
export const mahasiswaBiodataApi = {
  async get(): Promise<MahasiswaBiodata | null> {
    const { data } = await mahasiswaHttp.get<ApiResponse<MahasiswaBiodata | null>>('/mahasiswa-portal/biodata');
    return data.data;
  },
  async save(payload: MahasiswaBiodataPayload): Promise<MahasiswaBiodata> {
    const { data } = await mahasiswaHttp.put<ApiResponse<MahasiswaBiodata>>('/mahasiswa-portal/biodata', payload);
    return data.data;
  },
};

export type StatusPresensiMahasiswa = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';

/** Satu pertemuan realisasi dosen + status presensi mahasiswa yang login. */
export interface RealisasiPertemuan {
  kehadiranDosenId: number;
  pertemuanKe: number;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  statusDosen: 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT';
  dosen: string | null;
  materi: string | null;
  keteranganDosen: string | null;
  statusSaya: StatusPresensiMahasiswa | null;
  bisaPresensi: boolean;
  alasanTidakBisa: string | null;
}

export interface RealisasiJadwalMahasiswa {
  jadwal: {
    id: number;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    sks: number | null;
    hari: string[] | null;
    jam: number | null;
    ruangan: string | null;
    dosen: string | null;
  };
  krsStatus: string;
  ringkasan: { pertemuan: number; hadir: number; izinSakit: number; alpa: number };
  pertemuan: RealisasiPertemuan[];
}

export const mahasiswaPresensiApi = {
  async realisasi(jadwalKuliahId: number): Promise<RealisasiJadwalMahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<RealisasiJadwalMahasiswa>>(
      `/mahasiswa-portal/jadwal/${jadwalKuliahId}/realisasi`
    );
    return data.data;
  },
  async hadir(jadwalKuliahId: number, kehadiranDosenId: number): Promise<RealisasiJadwalMahasiswa> {
    const { data } = await mahasiswaHttp.post<ApiResponse<RealisasiJadwalMahasiswa>>(
      `/mahasiswa-portal/jadwal/${jadwalKuliahId}/realisasi/${kehadiranDosenId}/hadir`
    );
    return data.data;
  },
};

export type StatusTagihanKuliah = 'LUNAS' | 'BELUM_LUNAS' | 'BELUM_BAYAR';

export interface RiwayatPembayaranItem {
  id: number;
  nomorKwitansi: string;
  tanggalBayar: string;
  noBukti: string | null;
  nominal: number;
  kodeBank: string | null;
  keterangan: string | null;
}

export interface RiwayatTagihanKuliah {
  id: number;
  semester: number;
  tahunAjaran: string | null;
  sksDiambil: number;
  hargaPerSks: number;
  biayaSks: number;
  biayaBpp: number;
  biayaSpp: number;
  potongan: number;
  totalTagihan: number;
  totalDibayar: number;
  /** Total bayar menurut file keuangan saat import (bukan transaksi kasir). */
  dibayarImport: number;
  sisaTagihan: number;
  /** Utang semester sebelumnya (dari import), terpisah dari sisa semester ini. */
  tunggakan: number;
  tanggalJatuhTempo: string | null;
  noVirtualAccount: string | null;
  status: StatusTagihanKuliah;
  /** Cicilan bulanan (kosong = dibayar sekaligus); pembayaran melunasi cicilan paling awal dulu. */
  cicilan: {
    cicilanKe: number;
    periode: string;
    nominal: number;
    dibayar: number;
    sisa: number;
    tanggalJatuhTempo: string | null;
    noVirtualAccount: string | null;
    status: StatusTagihanKuliah;
    terlambat: boolean;
  }[];
  pembayaran: RiwayatPembayaranItem[];
}

export interface RiwayatPembayaran {
  ringkasan: {
    totalTagihan: number;
    totalDibayar: number;
    sisaTagihan: number;
    tunggakan: number;
    totalKewajiban: number;
    /** VA hasil Import VA yang berlaku hari ini / akan dibuka; null = belum ada. */
    vaAktif: {
      noVirtualAccount: string;
      periodeOpen: string;
      periodeClose: string;
      nominal: number;
      status: 'BERLAKU' | 'AKAN_DATANG';
    } | null;
    /** VA yang ditampilkan: vaAktif, atau VA tagihan terbaru (atau VA terakhir yang pernah diisi keuangan). */
    noVirtualAccount: string | null;
  };
  tagihan: RiwayatTagihanKuliah[];
}

export const mahasiswaPembayaranApi = {
  async list(): Promise<RiwayatPembayaran> {
    const { data } = await mahasiswaHttp.get<ApiResponse<RiwayatPembayaran>>('/mahasiswa-portal/pembayaran');
    return data.data;
  },
  async kwitansiPdf(pembayaranId: number): Promise<Blob> {
    const { data } = await mahasiswaHttp.get(`/mahasiswa-portal/pembayaran/${pembayaranId}/kwitansi`, { responseType: 'blob' });
    return data;
  },
};

// ---- Pengajuan → Kuliah Kerja Praktek ----
export interface PendaftaranKkp {
  id: number;
  semester: number | null;
  judul: string;
  perusahaan: string;
  alamat: string | null;
  email: string | null;
  telepon: string | null;
  pembimbingMagangId: number | null;
  pembimbing: string | null;
  pembimbingLapangan: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  nilai: number | null;
  grade: string | null;
  /** false = nilai sudah diisi prodi, pendaftaran terkunci. */
  bisaDiubah: boolean;
  updatedAt: string;
}

export interface FormKkp {
  mahasiswa: { nim: string; namaLengkap: string; prodi: string };
  tahunAjaran: { id: number; label: string };
  semesterBerjalan: number;
  pembimbingOptions: { value: number; label: string }[];
  pendaftaran: PendaftaranKkp | null;
}

export interface SaveKkpPayload {
  judul: string;
  perusahaan: string;
  alamat: string | null;
  email: string | null;
  telepon: string | null;
  pembimbingMagangId: number | null;
  semester: number;
}

export const mahasiswaKkpApi = {
  async getForm(): Promise<FormKkp> {
    const { data } = await mahasiswaHttp.get<ApiResponse<FormKkp>>('/mahasiswa-portal/pengajuan/kkp');
    return data.data;
  },
  async save(payload: SaveKkpPayload): Promise<PendaftaranKkp> {
    const { data } = await mahasiswaHttp.put<ApiResponse<PendaftaranKkp>>('/mahasiswa-portal/pengajuan/kkp', payload);
    return data.data;
  },
};

// ---- Pengajuan → Cuti ----
export type StatusPengajuanCuti = 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';

export interface PengajuanCuti {
  id: number;
  semester: number;
  tanggalAwal: string;
  tanggalAkhir: string;
  tanggalAjuan: string;
  alasan: string;
  status: StatusPengajuanCuti;
  catatanProdi: string | null;
  tahunAjaran: string | null;
}

export interface FormCuti {
  mahasiswa: { nim: string; namaLengkap: string; prodi: string };
  tahunAjaran: string | null;
  semesterBerjalan: number | null;
  /** true = mahasiswa sedang berstatus CUTI, tidak bisa mengajukan lagi. */
  sedangCuti: boolean;
  riwayat: PengajuanCuti[];
}

export interface AjukanCutiPayload {
  semester: number;
  tanggalAwal: string;
  tanggalAkhir: string;
  alasan: string;
}

export const mahasiswaCutiApi = {
  async getForm(): Promise<FormCuti> {
    const { data } = await mahasiswaHttp.get<ApiResponse<FormCuti>>('/mahasiswa-portal/pengajuan/cuti');
    return data.data;
  },
  async ajukan(payload: AjukanCutiPayload): Promise<PengajuanCuti> {
    const { data } = await mahasiswaHttp.post<ApiResponse<PengajuanCuti>>('/mahasiswa-portal/pengajuan/cuti', payload);
    return data.data;
  },
  async batalkan(id: number): Promise<void> {
    await mahasiswaHttp.delete(`/mahasiswa-portal/pengajuan/cuti/${id}`);
  },
  async cetakPdf(id: number): Promise<Blob> {
    const { data } = await mahasiswaHttp.get(`/mahasiswa-portal/pengajuan/cuti/${id}/pdf`, { responseType: 'blob' });
    return data;
  },
};

export interface JadwalSidangMahasiswa {
  id: number;
  tanggal: string;
  jam: string;
  ruangan: string | null;
  tahunAjaran: string | null;
  penguji: string | null;
}

export interface SidangMahasiswa {
  pengajuanTa: { judul: string; pembimbingUtama: string | null; pembimbingPendamping: string | null; jumlahBimbingan: number } | null;
  pendaftaran: {
    id: number;
    judul: string;
    pembimbing1: string | null;
    pembimbing2: string | null;
    tanggalDaftar: string;
    jadwal: JadwalSidangMahasiswa | null;
    nilai: { peran: string; dosen: string | null; nilai: number | null; grade: string }[];
    rataRata: number | null;
    koreksi: { id: number; peran: string; dosen: string | null; babHalaman: string | null; uraian: string; isSelesai: boolean }[];
    bisaDiubah: boolean;
  } | null;
  jadwalTersedia: JadwalSidangMahasiswa[];
}

/** Pengajuan sidang TA/Skripsi (portal mahasiswa). */
export const mahasiswaSidangApi = {
  async get(): Promise<SidangMahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<SidangMahasiswa>>('/mahasiswa-portal/sidang');
    return data.data;
  },
  async daftar(jadwalSidangId: number): Promise<{ message: string; data: SidangMahasiswa }> {
    const { data } = await mahasiswaHttp.post('/mahasiswa-portal/sidang', { jadwalSidangId });
    return data;
  },
  async batal(): Promise<void> {
    await mahasiswaHttp.delete('/mahasiswa-portal/sidang');
  },
};

/** Angket dosen (EDOM) tahun akademik aktif. */
export interface AngketDosenMahasiswa {
  tahunAjaran: string | null;
  jenjangPendidikan: string | null;
  pertanyaan: { id: number; kategori: string | null; pertanyaan: string; openQuestion: boolean }[];
  pilihanJawaban: { id: number; jawaban: string; nilai: number }[];
  kelas: {
    jadwalKuliahId: number;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    kelas: string;
    sks: number | null;
    kehadiran: { hadir: number; pertemuan: number };
    dosen: { dosenId: number; nidn: string | null; nama: string; penanggungJawab: boolean; sudahDiisi: boolean; diisiPada: string | null }[];
  }[];
  ringkasan: { total: number; sudah: number };
}

export interface IsiAngketDosenPayload {
  jadwalKuliahId: number;
  dosenId: number;
  jawaban: { pertanyaanId: number; nilai?: number | null; teks?: string | null }[];
  saran?: string | null;
}

export const mahasiswaAngketDosenApi = {
  async get(): Promise<AngketDosenMahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<AngketDosenMahasiswa>>('/mahasiswa-portal/edom');
    return data.data;
  },
  async submit(payload: IsiAngketDosenPayload): Promise<string> {
    const { data } = await mahasiswaHttp.post<ApiResponse<null>>('/mahasiswa-portal/edom', payload);
    return data.message;
  },
};

/** Kalender akademik (hanya lihat). tahunAjaranId kosong = tahun akademik aktif. */
export const mahasiswaKalenderAkademikApi = {
  async get(tahunAjaranId?: number): Promise<{
    tahunAjaranId: number | null;
    tahunAjaranOptions: { value: number; label: string }[];
    items: import('./kalenderAkademik').KegiatanKalender[];
  }> {
    const { data } = await mahasiswaHttp.get('/mahasiswa-portal/kalender-akademik', { params: { tahunAjaranId } });
    return data.data;
  },
};
