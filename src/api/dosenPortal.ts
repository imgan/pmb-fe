import { dosenHttp } from './dosenHttp';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type {
  DosenPortalJadwal,
  PresensiMahasiswaRow,
  RealisasiMengajar,
  RekapMahasiswaRow,
  SavePresensiMahasiswaItem,
  SilabusMatakuliahRow,
  NilaiSidangRow,
  PeranSidang,
  KoreksiSidangItem,
  RingkasanKelasDosen,
} from '@/types/entities';
import { filenameFromDisposition, type NamedBlob } from '@/utils/download';
import type { BobotObe } from './bobotObe';
import type { KartuBimbingan } from './mahasiswaPortal';

export interface RealisasiMengajarPayload {
  jadwalKuliahId: number;
  tanggalRealisasi: string;
  jamMasuk: string;
  jamKeluar: string;
  pertemuanKe: number;
  status: RealisasiMengajar['status'];
  keterangan?: string | null;
  uraian?: string | null;
}

export const dosenJadwalApi = {
  async listMine(): Promise<DosenPortalJadwal[]> {
    const { data } = await dosenHttp.get<ApiResponse<DosenPortalJadwal[]>>('/dosen-portal/jadwal');
    return data.data;
  },
};

export const dosenRingkasanKelasApi = {
  async get(jadwalKuliahId: number): Promise<RingkasanKelasDosen> {
    const { data } = await dosenHttp.get<ApiResponse<RingkasanKelasDosen>>(`/dosen-portal/jadwal/${jadwalKuliahId}/ringkasan`);
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
  // jamKeluar boleh null saat edit: kelas yang sudah dimulai tapi belum diselesaikan.
  async update(
    id: number,
    payload: Partial<Omit<RealisasiMengajarPayload, 'jamKeluar'>> & { jamKeluar?: string | null }
  ): Promise<RealisasiMengajar> {
    const { data } = await dosenHttp.put<ApiResponse<RealisasiMengajar>>(`/dosen-portal/realisasi/${id}`, payload);
    return data.data;
  },
  async remove(id: number | string): Promise<void> {
    await dosenHttp.delete(`/dosen-portal/realisasi/${id}`);
  },
  /** Kelas yang sedang berjalan (sudah Mulai, belum Selesai); null bila tidak ada. */
  async aktif(): Promise<RealisasiMengajar | null> {
    const { data } = await dosenHttp.get<ApiResponse<RealisasiMengajar | null>>('/dosen-portal/realisasi/aktif');
    return data.data;
  },
  async start(payload: { jadwalKuliahId: number; pertemuanKe?: number | null; uraian?: string | null; keterangan?: string | null }): Promise<RealisasiMengajar> {
    const { data } = await dosenHttp.post<ApiResponse<RealisasiMengajar>>('/dosen-portal/realisasi/start', payload);
    return data.data;
  },
  async stop(id: number, payload: { uraian?: string | null; keterangan?: string | null } = {}): Promise<RealisasiMengajar> {
    const { data } = await dosenHttp.post<ApiResponse<RealisasiMengajar>>(`/dosen-portal/realisasi/${id}/stop`, payload);
    return data.data;
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

export const dosenNilaiSidangApi = {
  async list(): Promise<NilaiSidangRow[]> {
    const { data } = await dosenHttp.get<ApiResponse<NilaiSidangRow[]>>('/dosen-portal/nilai-sidang');
    return data.data;
  },
  async save(pendaftarSidangId: number, payload: { peran: PeranSidang; nilai: number }): Promise<NilaiSidangRow> {
    const { data } = await dosenHttp.put<ApiResponse<NilaiSidangRow>>(
      `/dosen-portal/nilai-sidang/${pendaftarSidangId}`,
      payload
    );
    return data.data;
  },
};

export interface KoreksiSidangPayload {
  babHalaman?: string | null;
  uraian?: string;
  isSelesai?: boolean;
}

export const dosenKoreksiSidangApi = {
  async list(pendaftarSidangId: number, peran: PeranSidang): Promise<KoreksiSidangItem[]> {
    const { data } = await dosenHttp.get<ApiResponse<KoreksiSidangItem[]>>(`/dosen-portal/koreksi-sidang/${pendaftarSidangId}`, {
      params: { peran },
    });
    return data.data;
  },
  async create(pendaftarSidangId: number, payload: KoreksiSidangPayload & { peran: PeranSidang; uraian: string }): Promise<KoreksiSidangItem> {
    const { data } = await dosenHttp.post<ApiResponse<KoreksiSidangItem>>(`/dosen-portal/koreksi-sidang/${pendaftarSidangId}`, payload);
    return data.data;
  },
  async update(id: number, payload: KoreksiSidangPayload): Promise<KoreksiSidangItem> {
    const { data } = await dosenHttp.put<ApiResponse<KoreksiSidangItem>>(`/dosen-portal/koreksi-sidang/item/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await dosenHttp.delete(`/dosen-portal/koreksi-sidang/item/${id}`);
  },
  async cetakPdf(pendaftarSidangId: number, peran: PeranSidang): Promise<NamedBlob> {
    const { data, headers } = await dosenHttp.get(`/dosen-portal/koreksi-sidang/${pendaftarSidangId}/pdf`, {
      params: { peran },
      responseType: 'blob',
    });
    return { blob: data, filename: filenameFromDisposition(headers['content-disposition'], 'LEMBAR_KOREKSI_SIDANG_TA.pdf') };
  },
};

export type StatusKrsBimbingan = 'DRAFT' | 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';

/** KRS mahasiswa bimbingan akademik dosen yang login. */
export interface KrsBimbinganRow {
  id: number;
  semester: number;
  status: StatusKrsBimbingan;
  updatedAt: string;
  totalSks: number;
  mahasiswa: { id: number; nim: string; namaLengkap: string; tahunMasuk: number | null; jurusan?: { namaJurusan: string } | null };
  tahunAjaran?: { id: number; nama: string; jenisSemester: string } | null;
  detailList: {
    id: number;
    kelasKuliah?: {
      id: number;
      kelas: string;
      kodeMataKuliah: string;
      namaMataKuliah: string;
      sks: number | null;
      hari: string[] | null;
      jam: number | null;
      dosenKordinator?: { namaLengkap: string } | null;
    } | null;
  }[];
}

export const dosenKrsBimbinganApi = {
  async list(params: { status?: StatusKrsBimbingan | 'SEMUA' } = {}): Promise<{ jumlahBimbingan: number; rows: KrsBimbinganRow[] }> {
    const { data } = await dosenHttp.get<ApiResponse<{ jumlahBimbingan: number; rows: KrsBimbinganRow[] }>>(
      '/dosen-portal/krs-bimbingan',
      { params }
    );
    return data.data;
  },
  async setujui(id: number): Promise<KrsBimbinganRow> {
    const { data } = await dosenHttp.post<ApiResponse<KrsBimbinganRow>>(`/dosen-portal/krs-bimbingan/${id}/setujui`);
    return data.data;
  },
  async setujuiMassal(ids: number[]): Promise<{ disetujui: number; dilewati: { id: number; alasan: string }[] }> {
    const { data } = await dosenHttp.post<ApiResponse<{ disetujui: number; dilewati: { id: number; alasan: string }[] }>>(
      '/dosen-portal/krs-bimbingan/setujui-massal',
      { ids }
    );
    return data.data;
  },
  async tolak(id: number): Promise<KrsBimbinganRow> {
    const { data } = await dosenHttp.post<ApiResponse<KrsBimbinganRow>>(`/dosen-portal/krs-bimbingan/${id}/tolak`);
    return data.data;
  },
};

// ---- Fitur per kelas (realisasi, rekap kehadiran, input nilai) ----
export type StatusPresensi = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';

export interface InfoKelasDosen {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  semester: number | null;
  tahunAjaran: string | null;
  ruangan: string | null;
  dosenKordinator: string;
  dosenPengampu: string[];
}

export interface RekapKehadiranKelas {
  kelas: InfoKelasDosen;
  pertemuan: { id: number; pertemuanKe: number; tanggal: string }[];
  mahasiswa: {
    no: number;
    mahasiswaId: number;
    nim: string;
    namaLengkap: string;
    status: (StatusPresensi | null)[];
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    persen: number;
  }[];
}

export interface NilaiKelasRow {
  no: number;
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  semester: number;
  partisipatif: number | null;
  tugas: number | null;
  quiz: number | null;
  proyek: number | null;
  uts: number | null;
  uas: number | null;
  nilai: number | null;
  grade: string | null;
}

export type KomponenNilai = 'partisipatif' | 'tugas' | 'quiz' | 'proyek' | 'uts' | 'uas';

export const dosenKelasApi = {
  async rekapKehadiran(jadwalKuliahId: number): Promise<RekapKehadiranKelas> {
    const { data } = await dosenHttp.get<ApiResponse<RekapKehadiranKelas>>(`/dosen-portal/kelas/${jadwalKuliahId}/rekap-kehadiran`);
    return data.data;
  },
  async nilai(jadwalKuliahId: number): Promise<{ kelas: InfoKelasDosen; bobotObe: BobotObe | null; mahasiswa: NilaiKelasRow[] }> {
    const { data } = await dosenHttp.get<ApiResponse<{ kelas: InfoKelasDosen; bobotObe: BobotObe | null; mahasiswa: NilaiKelasRow[] }>>(`/dosen-portal/kelas/${jadwalKuliahId}/nilai`);
    return data.data;
  },
  async simpanNilai(
    jadwalKuliahId: number,
    items: ({ mahasiswaId: number } & Record<KomponenNilai, number | null>)[]
  ): Promise<{ kelas: InfoKelasDosen; mahasiswa: NilaiKelasRow[] }> {
    const { data } = await dosenHttp.put<ApiResponse<{ kelas: InfoKelasDosen; mahasiswa: NilaiKelasRow[] }>>(`/dosen-portal/kelas/${jadwalKuliahId}/nilai`, { items });
    return data.data;
  },
  /** PDF cetakan kelas: realisasi mengajar, rekap kehadiran, atau daftar nilai. */
  async pdf(jadwalKuliahId: number, jenis: 'realisasi' | 'rekap-kehadiran' | 'nilai'): Promise<Blob> {
    const { data } = await dosenHttp.get(`/dosen-portal/kelas/${jadwalKuliahId}/${jenis}/pdf`, { responseType: 'blob' });
    return data;
  },
};

export interface MahasiswaBimbinganTa {
  pengajuanId: number;
  nim: string;
  namaLengkap: string;
  prodi: string | null;
  judul: string;
  periodeId: number;
  noTelepon: string | null;
  email: string | null;
  peran: 'UTAMA' | 'PENDAMPING';
  status: 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';
  statusLabel: string;
  catatanProdi: string | null;
  statusBayar: { lunas: boolean; dibayar: number };
  statusSidang: { label: string; tanggal: string | null };
  jumlahBimbingan: number;
}

export interface CatatanBimbinganPayload {
  tanggal: string;
  pokokPembahasan: string;
  keterangan: string | null;
}

/** Bimbingan TA/Skripsi: mahasiswa bimbingan & catatan konsultasi (kartu bimbingan). */
export const dosenBimbinganTaApi = {
  async listPeriode(): Promise<{ id: number; tanggalMulai: string; tanggalSelesai: string }[]> {
    const { data } = await dosenHttp.get<ApiResponse<{ id: number; tanggalMulai: string; tanggalSelesai: string }[]>>('/dosen-portal/bimbingan-ta/periode');
    return data.data;
  },
  async listMahasiswa(periodeId?: number | null): Promise<MahasiswaBimbinganTa[]> {
    const { data } = await dosenHttp.get<ApiResponse<MahasiswaBimbinganTa[]>>('/dosen-portal/bimbingan-ta', {
      params: periodeId ? { periodeId } : {},
    });
    return data.data;
  },
  async kartu(pengajuanId: number): Promise<KartuBimbingan> {
    const { data } = await dosenHttp.get<ApiResponse<KartuBimbingan>>(`/dosen-portal/bimbingan-ta/${pengajuanId}`);
    return data.data;
  },
  async tambah(pengajuanId: number, payload: CatatanBimbinganPayload): Promise<KartuBimbingan> {
    const { data } = await dosenHttp.post<ApiResponse<KartuBimbingan>>(`/dosen-portal/bimbingan-ta/${pengajuanId}`, payload);
    return data.data;
  },
  async ubah(id: number, payload: CatatanBimbinganPayload): Promise<KartuBimbingan> {
    const { data } = await dosenHttp.put<ApiResponse<KartuBimbingan>>(`/dosen-portal/bimbingan-ta/catatan/${id}`, payload);
    return data.data;
  },
  async hapus(id: number): Promise<KartuBimbingan> {
    const { data } = await dosenHttp.delete<ApiResponse<KartuBimbingan>>(`/dosen-portal/bimbingan-ta/catatan/${id}`);
    return data.data;
  },
};

export interface RiwayatPendidikanDosen {
  id: number;
  perguruanTinggi: string;
  jenjang: string;
  programStudi: string | null;
  gelar: string | null;
  tahunLulus: number | null;
  noIjazah: string | null;
}

export interface BiodataDosenSdm {
  id: number;
  nidn: string;
  nuptk: string | null;
  namaLengkap: string;
  gelar: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: 'L' | 'P' | null;
  agama: string | null;
  email: string | null;
  alamat: string | null;
  telpHp: string | null;
  noWhatsapp: string | null;
  pendidikanAkhir: string | null;
  jabatanFungsional: string | null;
  kum: number | null;
  statusDosen: 'TETAP' | 'TIDAK_TETAP' | null;
  jenisDosen: 'INTERNAL' | 'EKSTERNAL';
  jurusan: { id: number; namaJurusan: string } | null;
  riwayatPendidikan: RiwayatPendidikanDosen[];
}

export interface StatusMahasiswaProdi {
  prodi?: string;
  jumlah: number;
  aktif: number;
  cuti: number;
  nonAktif: number;
  lulus: number;
  dikeluarkan: number;
  mengundurkanDiri: number;
}

export interface IndeksKepuasan {
  /** Skala 0–4; null = belum ada data. */
  indeks: number | null;
  responden: number;
}

export interface DashboardDosen {
  tahunAjaran: string | null;
  pengumuman: { id: number; judul: string; isi: string; tanggalTerbit: string; isPenting: boolean }[];
  biodata: BiodataDosenSdm;
  ringkasan: {
    mahasiswaAktif: number;
    persenAktif: number;
    kehadiran: { hadir: number; target: number; jumlahKelas: number; persen: number };
    lulusan: number;
    persenLulus: number;
  };
  kepuasan: { mahasiswa: IndeksKepuasan; dosen: IndeksKepuasan; pembimbingan: IndeksKepuasan };
  statistikProdi: { prodi: (StatusMahasiswaProdi & { prodi: string })[]; total: StatusMahasiswaProdi };
}

export type BiodataDosenPayload = Partial<
  Pick<BiodataDosenSdm, 'tempatLahir' | 'tanggalLahir' | 'jenisKelamin' | 'agama' | 'email' | 'alamat' | 'telpHp' | 'noWhatsapp' | 'pendidikanAkhir'>
>;
export type RiwayatPendidikanPayload = Omit<RiwayatPendidikanDosen, 'id'>;

export interface PengumumanDosen {
  id: number;
  judul: string;
  isi: string;
  tanggalTerbit: string;
  tanggalBerakhir: string | null;
  isPenting: boolean;
  jurusan?: { id: number; namaJurusan: string } | null;
}

/** Pengumuman BAAK yang sedang tayang untuk dosen. */
export const dosenPengumumanApi = {
  async list(): Promise<PengumumanDosen[]> {
    const { data } = await dosenHttp.get<ApiResponse<PengumumanDosen[]>>('/dosen-portal/pengumuman');
    return data.data;
  },
};

/** Dashboard dosen: pengumuman & biodata pada SDM (bisa diedit sendiri). */
export const dosenDashboardApi = {
  async get(): Promise<DashboardDosen> {
    const { data } = await dosenHttp.get<ApiResponse<DashboardDosen>>('/dosen-portal/dashboard');
    return data.data;
  },
  async updateBiodata(payload: BiodataDosenPayload): Promise<BiodataDosenSdm> {
    const { data } = await dosenHttp.put<ApiResponse<BiodataDosenSdm>>('/dosen-portal/biodata', payload);
    return data.data;
  },
  async tambahRiwayat(payload: RiwayatPendidikanPayload): Promise<BiodataDosenSdm> {
    const { data } = await dosenHttp.post<ApiResponse<BiodataDosenSdm>>('/dosen-portal/riwayat-pendidikan', payload);
    return data.data;
  },
  async ubahRiwayat(id: number, payload: RiwayatPendidikanPayload): Promise<BiodataDosenSdm> {
    const { data } = await dosenHttp.put<ApiResponse<BiodataDosenSdm>>(`/dosen-portal/riwayat-pendidikan/${id}`, payload);
    return data.data;
  },
  async hapusRiwayat(id: number): Promise<BiodataDosenSdm> {
    const { data } = await dosenHttp.delete<ApiResponse<BiodataDosenSdm>>(`/dosen-portal/riwayat-pendidikan/${id}`);
    return data.data;
  },
};

export interface RekapRealisasiDosen {
  id: number;
  hariJam: string;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  dosenKordinator: string | null;
  peran: 'Koordinator' | 'Pengampu';
  jam: number | null;
  ruangan: string | null;
  hadir: number;
  izin: number;
  sakit: number;
  tidakHadir: number;
  realisasiTerakhir: string | null;
  /** Realisasi hadir dibanding target 16 pertemuan. */
  persen: number;
}

/** Rekap realisasi mengajar per kelas yang diampu (mengikuti menu BAAK Cetak Realisasi). */
export const dosenRekapRealisasiApi = {
  async list(): Promise<RekapRealisasiDosen[]> {
    const { data } = await dosenHttp.get<ApiResponse<RekapRealisasiDosen[]>>('/dosen-portal/rekap-realisasi');
    return data.data;
  },
};

// ---- Lain-Lain → Kesediaan Mengajar ----
export const HARI_KESEDIAAN = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'] as const;
export type HariKesediaan = (typeof HARI_KESEDIAAN)[number];

/** Jam kesediaan per hari dalam format "HH:MM-HH:MM"; null = tidak bersedia hari itu. */
export type JamKesediaan = Record<HariKesediaan, string | null>;

export interface KesediaanMengajar extends JamKesediaan {
  id: number;
  mataKuliahId: number;
  kodeMk: string | null;
  namaMk: string | null;
  sks: number | null;
}

export interface KesediaanMengajarData {
  tahunAjaran: { id: number; label: string };
  mataKuliahOptions: { value: number; label: string }[];
  items: KesediaanMengajar[];
}

export type KesediaanMengajarPayload = JamKesediaan & { mataKuliahId: number };

export const dosenKesediaanMengajarApi = {
  async get(): Promise<KesediaanMengajarData> {
    const { data } = await dosenHttp.get<ApiResponse<KesediaanMengajarData>>('/dosen-portal/kesediaan-mengajar');
    return data.data;
  },
  async create(payload: KesediaanMengajarPayload): Promise<KesediaanMengajar> {
    const { data } = await dosenHttp.post<ApiResponse<KesediaanMengajar>>('/dosen-portal/kesediaan-mengajar', payload);
    return data.data;
  },
  async update(id: number, payload: KesediaanMengajarPayload): Promise<KesediaanMengajar> {
    const { data } = await dosenHttp.put<ApiResponse<KesediaanMengajar>>(`/dosen-portal/kesediaan-mengajar/${id}`, payload);
    return data.data;
  },
  async remove(id: number): Promise<void> {
    await dosenHttp.delete(`/dosen-portal/kesediaan-mengajar/${id}`);
  },
};

export interface MahasiswaPa {
  id: number;
  nim: string;
  namaLengkap: string;
  noTelepon: string | null;
  email: string | null;
  prodi: string | null;
  kelas: string | null;
  angkatan: number | null;
  status: string;
  ipk: number | null;
  totalSks: number;
  krsTerakhir: { id: number; semester: number; tahunAjaran: string | null; status: string } | null;
}

export interface BiodataMahasiswaPa {
  nim: string;
  namaLengkap: string;
  prodi: string | null;
  angkatan: number | null;
  hp: string | null;
  email: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string | null;
  agama: string | null;
  alamat: string | null;
  teleponRumah: string | null;
  waktuKuliah: string | null;
  namaAyah: string | null;
  pekerjaanAyah: string | null;
  namaIbu: string | null;
  pekerjaanIbu: string | null;
  namaWali: string | null;
}

export interface KrsMahasiswaPa {
  semester: number;
  tahunAjaran: string | null;
  status: string;
  totalSks: number;
  mataKuliah: { kodeMataKuliah: string; namaMataKuliah: string; kelas: string; sks: number; semester: number | null }[];
}

/** Lain-Lain → Mahasiswa Bimbingan Akademik (mahasiswa yang dibimbing dosen PA ini). */
export const dosenMahasiswaPaApi = {
  async list(): Promise<MahasiswaPa[]> {
    const { data } = await dosenHttp.get<ApiResponse<MahasiswaPa[]>>('/dosen-portal/mahasiswa-pa');
    return data.data;
  },
  async biodata(id: number): Promise<BiodataMahasiswaPa> {
    const { data } = await dosenHttp.get<ApiResponse<BiodataMahasiswaPa>>(`/dosen-portal/mahasiswa-pa/${id}/biodata`);
    return data.data;
  },
  async krs(id: number): Promise<KrsMahasiswaPa | null> {
    const { data } = await dosenHttp.get<ApiResponse<KrsMahasiswaPa | null>>(`/dosen-portal/mahasiswa-pa/${id}/krs`);
    return data.data;
  },
  async khsPdf(id: number): Promise<Blob> {
    const { data } = await dosenHttp.get(`/dosen-portal/mahasiswa-pa/${id}/khs-pdf`, { responseType: 'blob' });
    return data;
  },
};

export interface DosenPengajarKelas {
  urutan: number;
  dosenId: number;
  nidn: string | null;
  nama: string;
  sks: number | null;
  penanggungJawab: boolean;
  /** Dosen dinilai mahasiswa lewat kuesioner kelas. */
  isiKuesioner: boolean;
  /** Dosen yang sedang login. */
  saya: boolean;
  hari: string[];
  jam: number | null;
  ruangan: string | null;
}

export interface DetailKelasDosenPengajar {
  kelas: {
    id: number;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    sks: number | null;
    semester: number | null;
    tahunAjaran: string | null;
    ruangan: string | null;
    programStudi: string | null;
    kurikulum: number | null;
    peserta: number;
    hari: string[];
    jam: number | null;
  };
  dosenPengajar: DosenPengajarKelas[];
}

/** Detail kelas + tim dosen pengajar (Perkuliahan → Kelas Kuliah). */
export const dosenPengajarKelasApi = {
  async get(jadwalKuliahId: number): Promise<DetailKelasDosenPengajar> {
    const { data } = await dosenHttp.get<ApiResponse<DetailKelasDosenPengajar>>(`/dosen-portal/kelas/${jadwalKuliahId}/dosen-pengajar`);
    return data.data;
  },
};
