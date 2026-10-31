import { dosenHttp } from './dosenHttp';
import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse } from '@/types/common';

/** E-learning per kelas: dosen membuat Materi / Video (link) / Kuis dan meng-assign ke mahasiswa kelasnya. */
export type JenisKonten = 'MATERI' | 'VIDEO' | 'KUIS' | 'TUGAS';
/** SEMUA = peserta kelas, PILIHAN = mahasiswa tertentu, KAMPUS = semua mahasiswa aktif kampus. */
export type TargetKonten = 'SEMUA' | 'PILIHAN' | 'KAMPUS' | 'GRUP';

/** Target GRUP: susunan grup (anggota = id mahasiswa peserta kelas). */
export interface GrupKonten {
  nama: string;
  anggota: number[];
}

export interface ElearningKelas {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  /** Kunci tema ikon pilihan mata kuliah; null = otomatis. */
  ikon?: string | null;
  sks: number | null;
  semester: number | null;
  peserta: number;
  jumlah: { materi: number; video: number; kuis: number; tugas?: number };
  // Detail kelas (My Class dosen).
  hari?: string[];
  /** Jam ke- (urutan sesi jadwal). */
  jam?: number | null;
  ruangan?: string | null;
  /** Link kelas daring (Google Classroom, dsb.). */
  linkKelas?: string | null;
  peran?: 'KOORDINATOR' | 'PENGAMPU';
  isObe?: boolean;
  kelompok?: 'WAJIB' | 'PILIHAN' | null;
  /** Pertemuan terealisasi (presensi dosen). */
  pertemuan?: number;
  tugasBelumDinilai?: number;
  kontenTerakhir?: string | null;
}

export interface KontenRingkas {
  id: number;
  jadwalKuliahId: number;
  jenis: JenisKonten;
  judul: string;
  /** Materi: link video & sampul (thumbnail gambar pertama) untuk kartu daftar. */
  videoUrls?: string[];
  sampul?: string | null;
  sampulId?: number | null;
  /** Kategori (mis. Kuliah, Praktikum) & tagline badge sorotan (mis. Wajib, Baru). */
  kategori: string | null;
  /** Tagline badge sorotan — bisa lebih dari satu. */
  tagline: string[];
  /** Konten wajib (harus dibaca / ditonton / dikerjakan) atau opsional. */
  isWajib: boolean;
  /** Konten (kelas yang sama) yang harus diselesaikan mahasiswa dulu. */
  prasyaratId: number | null;
  dosenId: number;
  /** Nama dosen penerbit (nama + gelar). */
  namaDosen: string | null;
  deskripsi: string | null;
  url: string | null;
  lampiranNama: string | null;
  adaLampiran: boolean;
  pertemuanKe: number | null;
  tenggat: string | null;
  /** Kuis: durasi pengerjaan (menit), acak soal, tampilkan nilai ke mahasiswa. */
  durasiMenit?: number | null;
  acakSoal?: boolean;
  tampilkanHasil?: boolean;
  /** Periode tayang untuk mahasiswa (null = tanpa batas). */
  tersediaMulai: string | null;
  tersediaSampai: string | null;
  target: TargetKonten;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  jumlahPenerima: number;
  jumlahSoal: number;
  sudahMengerjakan: number;
  rataSkor: number | null;
  /** Dibuka mahasiswa: total kali & jumlah mahasiswa unik. */
  dilihat: { total: number; mahasiswa: number };
  /** Interaksi timeline (katalog dosen): jumlah suka, disukai dosen ini, jumlah komentar. */
  interaksi?: { suka: number; disukai: boolean; komentar: number };
}

export interface SesiPembelajaran {
  ke: number;
  judul: string | null;
  jenis: string | null;
  jumlahKonten: number;
}

export interface PesertaKelas {
  id: number;
  nim: string;
  nama: string;
}

export interface SoalKuis {
  id?: number | null;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number | null;
}

/** Gambar / dokumen materi (isi file diambil terpisah lewat api berkas). */
export interface BerkasMateri {
  id: number;
  jenis: 'GAMBAR' | 'DOKUMEN';
  nama: string;
  tipe: string | null;
  ukuran: number;
}

export interface KontenDetail extends Omit<KontenRingkas, 'jumlahPenerima' | 'jumlahSoal' | 'sudahMengerjakan' | 'rataSkor'> {
  isi: string | null;
  lampiran: string | null;
  /** Materi: link video YouTube / Google Drive. */
  videoUrls: string[];
  gambar: BerkasMateri[];
  dokumen: BerkasMateri[];
  penerima: number[];
  grup: GrupKonten[];
  soal: SoalKuis[];
  soalTerkunci: boolean;
}

export interface KontenPayload {
  jenis?: JenisKonten;
  judul: string;
  kategori?: string | null;
  tagline?: string[];
  isWajib?: boolean;
  prasyaratId?: number | null;
  deskripsi?: string | null;
  isi?: string | null;
  url?: string | null;
  /** undefined = tidak diubah, null = hapus, data URL = ganti. */
  lampiran?: string | null;
  lampiranNama?: string | null;
  /** Materi: link video YouTube / Google Drive. */
  videoUrls?: string[];
  /** Materi: jumlah gambar / dokumen yang akan diunggah setelah tersimpan. */
  jumlahBerkasBaru?: number;
  pertemuanKe?: number | null;
  tenggat?: string | null;
  durasiMenit?: number | null;
  acakSoal?: boolean;
  tampilkanHasil?: boolean;
  tersediaMulai?: string | null;
  tersediaSampai?: string | null;
  target: TargetKonten;
  penerima: number[];
  grup?: GrupKonten[];
  isPublished: boolean;
  soal: SoalKuis[];
}

export interface HasilKuis {
  konten: KontenRingkas;
  rows: { id: number; nim: string; nama: string; grup?: string; durasi?: number; sudah: boolean; benar: number | null; skor: number | null; dikirim: string | null }[];
  ringkasan: { penerima: number; sudah: number; rataSkor: number | null };
}

/** Laporan e-learning satu kelas: skor kuis per mahasiswa & jumlah mahasiswa yang melihat video / materi. */
export interface LaporanElearning {
  kelas: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; tahunAjaran: string };
  peserta: number;
  kuis: { id: number; judul: string; pertemuanKe: number | null; isWajib: boolean; penerima: number; mengerjakan: number; rata: number | null }[];
  /** skor[kuisId]: angka = skor, null = belum mengerjakan, tidak ada = bukan penerima kuis tsb. */
  nilai: (PesertaKelas & { skor: Record<string, number | null>; rata: number | null; dikerjakan: number; ditugaskan: number })[];
  konten: (KontenRingkas & {
    penerima: number;
    mahasiswaMelihat: number;
    totalDilihat: number;
    mahasiswaSelesai: number;
    rows: (PesertaKelas & { dilihat: number; durasi: number; terakhirDilihat: string | null; selesai: string | null })[];
  })[];
}

/** Popup setelah login dosen: jadwal kelas (untuk kalender minggu ini) & kuis yang belum dikerjakan semua mahasiswa. */
export interface RingkasanDosen {
  jadwal: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; hari: string[]; jam: number | null; ruangan: string | null }[];
  tugas: {
    id: number;
    jadwalKuliahId: number;
    jenis: JenisKonten;
    judul: string;
    isWajib: boolean;
    tenggat: string | null;
    lewat: boolean;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    penerima: number;
    sudah: number;
    belum: number;
  }[];
}

/** Penanda "baru login" — popup ringkasan dosen tampil sekali setelah login. */
export const RINGKASAN_DOSEN_KEY = 'pmb_dosen_tampilkan_ringkasan';

export interface KomentarKonten {
  id: number;
  isi: string;
  createdAt: string;
  nama: string;
  peran: 'DOSEN' | 'MAHASISWA';
  milikSaya: boolean;
}

/** Sinkronisasi Input Nilai: kehadiran + nilai kuis / tugas e-learning per mahasiswa. */
export interface SumberNilaiKelas {
  jumlahPertemuan: number;
  kehadiran: { mahasiswaId: number; hadir: number; izin: number; sakit: number; alpa: number }[];
  item: { id: number; jenis: 'KUIS' | 'TUGAS'; judul: string; kategori: string | null; pertemuanKe: number | null; tenggat: string | null; target: TargetKonten }[];
  /** nilai[mahasiswaId][itemId]; tidak ada = bukan penerima. */
  nilai: Record<number, Record<number, { nilai: number | null; status: 'SELESAI' | 'BELUM_DINILAI' | 'BELUM' }>>;
}

/** Laporan tugas kelas: ringkasan pengumpulan per tugas. */
export interface LaporanTugasKelas {
  kelas: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; tahunAjaran: string | null };
  tugas: {
    id: number;
    judul: string;
    pertemuanKe: number | null;
    tenggat: string | null;
    target: TargetKonten;
    isPublished: boolean;
    penerima: number;
    dikumpulkan: number;
    terlambat: number;
    dinilai: number;
    rataNilai: number | null;
  }[];
}

export interface PengumpulanTugas {
  konten: KontenRingkas;
  rows: (PesertaKelas & {
    /** Nama grup (target GRUP). */
    grup?: string;
    jawabanId: number | null;
    dikumpulkan: string | null;
    /** Tugas grup: anggota lain yang mengunggah untuk mahasiswa ini. */
    dikumpulkanOleh?: string | null;
    /** Durasi aktif membuka tugas (detik). */
    durasi?: number;
    terlambat: boolean;
    isi: string | null;
    lampiranNama: string | null;
    nilai: number | null;
    catatan: string | null;
    dinilaiAt: string | null;
  })[];
  ringkasan: { penerima: number; dikumpulkan: number; terlambat: number; dinilai: number; rataNilai: number | null };
}

export const dosenElearningApi = {
  async pengumpulan(id: number): Promise<PengumpulanTugas> {
    const { data } = await dosenHttp.get<ApiResponse<PengumpulanTugas>>(`/dosen-portal/elearning/konten/${id}/pengumpulan`);
    return data.data;
  },
  async lampiranJawaban(jawabanId: number): Promise<{ lampiran: string | null; lampiranNama: string | null }> {
    const { data } = await dosenHttp.get<ApiResponse<{ lampiran: string | null; lampiranNama: string | null }>>(`/dosen-portal/elearning/pengumpulan/${jawabanId}/lampiran`);
    return data.data;
  },
  async nilaiTugas(jawabanId: number, nilai: number, catatan: string | null) {
    await dosenHttp.put(`/dosen-portal/elearning/pengumpulan/${jawabanId}/nilai`, { nilai, catatan });
  },
  async suka(id: number): Promise<{ disukai: boolean; suka: number }> {
    const { data } = await dosenHttp.post<ApiResponse<{ disukai: boolean; suka: number }>>(`/dosen-portal/elearning/konten/${id}/suka`);
    return data.data;
  },
  async komentar(id: number): Promise<KomentarKonten[]> {
    const { data } = await dosenHttp.get<ApiResponse<KomentarKonten[]>>(`/dosen-portal/elearning/konten/${id}/komentar`);
    return data.data;
  },
  async tambahKomentar(id: number, isi: string): Promise<KomentarKonten[]> {
    const { data } = await dosenHttp.post<ApiResponse<KomentarKonten[]>>(`/dosen-portal/elearning/konten/${id}/komentar`, { isi });
    return data.data;
  },
  async hapusKomentar(komentarId: number) {
    await dosenHttp.delete(`/dosen-portal/elearning/komentar/${komentarId}`);
  },
  async ringkasan(): Promise<RingkasanDosen> {
    const { data } = await dosenHttp.get<ApiResponse<RingkasanDosen>>('/dosen-portal/elearning/ringkasan');
    return data.data;
  },
  async laporan(jadwalKuliahId: number | string): Promise<LaporanElearning> {
    const { data } = await dosenHttp.get<ApiResponse<LaporanElearning>>(`/dosen-portal/elearning/kelas/${jadwalKuliahId}/laporan`);
    return data.data;
  },
  async kelas(): Promise<ElearningKelas[]> {
    const { data } = await dosenHttp.get<ApiResponse<ElearningKelas[]>>('/dosen-portal/elearning/kelas');
    return data.data;
  },
  /** Semua konten di kelas yang diampu, dikelompokkan per kelas (tampilan katalog). */
  async kontenSaya(): Promise<{ kelas: Omit<ElearningKelas, 'semester' | 'jumlah'>; konten: KontenRingkas[] }[]> {
    const { data } = await dosenHttp.get('/dosen-portal/elearning/konten');
    return data.data;
  },
  async detailKelas(jadwalKuliahId: number | string): Promise<{
    kelas: { id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; sks: number | null; tahunAjaran: string };
    peserta: PesertaKelas[];
    /** Sesi pembelajaran 1..N: judul dari RPS (bila ada) & jumlah konten per sesi. */
    sesi: SesiPembelajaran[];
    /** Jumlah konten tanpa nomor pertemuan. */
    tanpaSesi: number;
    konten: KontenRingkas[];
  }> {
    const { data } = await dosenHttp.get(`/dosen-portal/elearning/kelas/${jadwalKuliahId}`);
    return data.data;
  },
  async konten(id: number): Promise<KontenDetail> {
    const { data } = await dosenHttp.get<ApiResponse<KontenDetail>>(`/dosen-portal/elearning/konten/${id}`);
    return data.data;
  },
  /** Kembalikan pesan sukses & id konten (dipakai untuk mengunggah gambar / dokumen materi). */
  async simpan(jadwalKuliahId: number, payload: KontenPayload, id?: number): Promise<{ pesan: string; id: number }> {
    const { data } = id
      ? await dosenHttp.put<ApiResponse<{ id: number }>>(`/dosen-portal/elearning/konten/${id}`, payload)
      : await dosenHttp.post<ApiResponse<{ id: number }>>(`/dosen-portal/elearning/kelas/${jadwalKuliahId}`, payload);
    return { pesan: data.message, id: data.data.id };
  },
  async tambahBerkas(id: number, body: { jenis: BerkasMateri['jenis']; nama: string; data: string }): Promise<number> {
    const { data } = await dosenHttp.post<ApiResponse<{ id: number }>>(`/dosen-portal/elearning/konten/${id}/berkas`, body);
    return data.data.id;
  },
  async hapusBerkas(id: number, berkasId: number) {
    await dosenHttp.delete(`/dosen-portal/elearning/konten/${id}/berkas/${berkasId}`);
  },
  /** Isi gambar / dokumen materi (data URL). */
  async berkas(id: number, berkasId: number): Promise<{ nama: string; tipe: string | null; data: string }> {
    const { data } = await dosenHttp.get<ApiResponse<{ nama: string; tipe: string | null; data: string }>>(`/dosen-portal/elearning/konten/${id}/berkas/${berkasId}`);
    return data.data;
  },
  async hapus(id: number) {
    await dosenHttp.delete(`/dosen-portal/elearning/konten/${id}`);
  },
  /** Bahan sinkronisasi Input Nilai: kehadiran & nilai kuis / tugas e-learning kelas. */
  async sumberNilai(jadwalKuliahId: number): Promise<SumberNilaiKelas> {
    const { data } = await dosenHttp.get<ApiResponse<SumberNilaiKelas>>(`/dosen-portal/elearning/kelas/${jadwalKuliahId}/sumber-nilai`);
    return data.data;
  },
  /** Laporan tugas kelas (ringkasan per tugas). */
  async laporanTugas(jadwalKuliahId: number): Promise<LaporanTugasKelas> {
    const { data } = await dosenHttp.get<ApiResponse<LaporanTugasKelas>>(`/dosen-portal/elearning/kelas/${jadwalKuliahId}/laporan-tugas`);
    return data.data;
  },
  /** Excel laporan tugas: kontenId kosong = semua tugas (Rekap Nilai + detail per tugas). */
  async exportLaporanTugas(jadwalKuliahId: number, kontenId: number | null = null): Promise<Blob> {
    const { data } = await dosenHttp.get(`/dosen-portal/elearning/kelas/${jadwalKuliahId}/laporan-tugas/export`, {
      params: kontenId ? { kontenId } : {},
      responseType: 'blob',
    });
    return data;
  },
  /** Template Excel soal kuis (Pertanyaan, Pilihan A–F, Jawaban Benar). */
  async templateSoal(): Promise<Blob> {
    const { data } = await dosenHttp.get('/dosen-portal/elearning/template-soal', { responseType: 'blob' });
    return data;
  },
  /** Baca soal dari Excel (tidak menyimpan) — hasil dimuat ke form kuis. */
  async importSoal(file: string): Promise<{ message: string; soal: SoalKuis[]; errors: { row: number; message: string }[] }> {
    const { data } = await dosenHttp.post<ApiResponse<{ soal: SoalKuis[]; errors: { row: number; message: string }[] }>>('/dosen-portal/elearning/import-soal', { file });
    return { message: data.message, ...data.data };
  },
  async hasil(id: number): Promise<HasilKuis> {
    const { data } = await dosenHttp.get<ApiResponse<HasilKuis>>(`/dosen-portal/elearning/konten/${id}/hasil`);
    return data.data;
  },
  /** Reset kuis satu mahasiswa (hapus jawaban & draf) agar bisa mengerjakan ulang. */
  async resetKuis(kontenId: number, mahasiswaId: number): Promise<void> {
    await dosenHttp.post(`/dosen-portal/elearning/konten/${kontenId}/hasil/${mahasiswaId}/reset`);
  },
};

// ---- Mahasiswa ----
export interface KontenMahasiswa {
  id: number;
  jadwalKuliahId: number;
  jenis: JenisKonten;
  judul: string;
  videoUrls?: string[];
  sampul?: string | null;
  sampulId?: number | null;
  kategori: string | null;
  tagline: string[];
  isWajib: boolean;
  deskripsi: string | null;
  url: string | null;
  lampiranNama: string | null;
  pertemuanKe: number | null;
  tenggat: string | null;
  createdAt: string;
  kelas: { kelas: string; kodeMataKuliah: string; namaMataKuliah: string; dosen: string | null };
  /** Dosen penerbit konten (nama + gelar). */
  namaDosen?: string | null;
  dilihat?: { total: number; mahasiswa: number };
  /** Interaksi timeline: suka (disukai = oleh mahasiswa ini) & komentar. */
  interaksi?: { suka: number; disukai: boolean; komentar: number };
  /** Kuis: skor & benar null bila dosen tidak menampilkan nilai. */
  hasil: { skor: number | null; benar: number | null; jumlahSoal: number; dikerjakan: string } | null;
  /** Kuis: durasi (menit), nilai ditampilkan, waktu mulai, batas akhir pengerjaan (min. tenggat & mulai + durasi). */
  durasiMenit?: number | null;
  tampilkanHasil?: boolean;
  mulaiAt?: string | null;
  batasAkhir?: string | null;
  /** Tugas: status pengumpulan & nilai dosen. */
  pengumpulan: { dikumpulkan: string; terlambat: boolean; nilai: number | null; catatan: string | null } | null;
  /** Kuis: draf pengerjaan yang belum dikirim. */
  draf: { disimpan: string; terjawab: number } | null;
  tersediaSampai: string | null;
  /** Kuis: sudah dikerjakan; materi / video: sudah ditandai dipelajari / ditonton. */
  selesai: boolean;
  prasyarat: { id: number; judul: string; jenis: JenisKonten; selesai: boolean } | null;
  /** Prasyarat belum diselesaikan — konten belum bisa dibuka. */
  terkunci: boolean;
  // Detail
  isi?: string | null;
  lampiran?: string | null;
  gambar?: BerkasMateri[];
  dokumen?: BerkasMateri[];
  soal?: { id: number; pertanyaan: string; pilihan: string[]; jawabanBenar?: number; jawabanAnda?: number | null }[];
  /** Kuis: jawaban draf { soalId: indexPilihan | null } untuk melanjutkan pengerjaan. */
  drafJawaban?: Record<string, number | null> | null;
  /** Kuis berdurasi yang belum dimulai: soal belum dikirim. */
  perluMulai?: boolean;
  jumlahSoal?: number;
  /** Target GRUP: grup mahasiswa ini beserta anggotanya. */
  grup?: { nama: string; anggota: { nim: string; nama: string }[] } | null;
  jawabanTugas?: {
    isi: string | null;
    lampiran: string | null;
    lampiranNama: string | null;
    terlambat: boolean;
    nilai: number | null;
    catatan: string | null;
    dikumpulkan: string;
    dinilaiAt: string | null;
    /** Tugas grup: nama anggota yang mengunggah (null = diri sendiri). */
    dikumpulkanOleh?: string | null;
  } | null;
}

/** Learning History: konten kelas semester lampau beserta status belajar. */
export interface RingkasanRiwayat {
  jumlah: number;
  selesai: number;
  rataKuis: number | null;
  rataTugas: number | null;
}
export interface ItemRiwayat {
  id: number;
  jenis: JenisKonten;
  judul: string;
  pertemuanKe: number | null;
  isWajib: boolean;
  dosen: string | null;
  status: 'SELESAI' | 'DIBUKA' | 'BELUM';
  selesaiPada: string | null;
  skor: number | null;
  nilaiTugas: number | null;
  terlambat: boolean;
  dilihat: number;
  terakhirDilihat: string | null;
}
export interface RiwayatBelajar {
  ringkasan: RingkasanRiwayat;
  periode: {
    id: number;
    nama: string;
    aktif: boolean;
    ringkasan: RingkasanRiwayat;
    kelas: { jadwalKuliahId: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; ikon?: string | null; sks: number | null; ringkasan: RingkasanRiwayat; konten: ItemRiwayat[] }[];
  }[];
}

/** My Team: konten / tugas grup + grup mahasiswa & anggota satu tim (dikumpulkan: waktu kumpul tugas). */
export interface KontenTim extends KontenMahasiswa {
  ikon: string | null;
  grup: { nama: string; anggota: { nim: string; nama: string; saya: boolean; dikumpulkan: string | null; pengunggah: boolean }[] };
}

/** My Class mahasiswa: kelas KRS disetujui tahun ajaran aktif + jumlah konten. */
export interface KelasMahasiswaElearning {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  ikon?: string | null;
  sks: number | null;
  semester: number | null;
  dosen: string | null;
  tahunAjaran: string;
  jumlah: number;
  selesai: number;
}

export const mahasiswaElearningApi = {
  /** Isi gambar / dokumen materi (data URL). */
  async berkas(id: number, berkasId: number): Promise<{ nama: string; tipe: string | null; data: string }> {
    const { data } = await mahasiswaHttp.get<ApiResponse<{ nama: string; tipe: string | null; data: string }>>(`/mahasiswa-portal/elearning/${id}/berkas/${berkasId}`);
    return data.data;
  },
  /** semuaPeriode = termasuk semester berjalan. */
  async riwayat(semuaPeriode = false): Promise<RiwayatBelajar> {
    const { data } = await mahasiswaHttp.get<ApiResponse<RiwayatBelajar>>('/mahasiswa-portal/elearning/riwayat', { params: semuaPeriode ? { semuaPeriode: 1 } : {} });
    return data.data;
  },
  /** My Team: tugas & konten grup yang memuat mahasiswa ini. */
  async tim(): Promise<KontenTim[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KontenTim[]>>('/mahasiswa-portal/elearning/tim');
    return data.data;
  },
  async kelas(): Promise<KelasMahasiswaElearning[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KelasMahasiswaElearning[]>>('/mahasiswa-portal/elearning/kelas');
    return data.data;
  },
  async suka(id: number): Promise<{ disukai: boolean; suka: number }> {
    const { data } = await mahasiswaHttp.post<ApiResponse<{ disukai: boolean; suka: number }>>(`/mahasiswa-portal/elearning/${id}/suka`);
    return data.data;
  },
  async komentar(id: number): Promise<KomentarKonten[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KomentarKonten[]>>(`/mahasiswa-portal/elearning/${id}/komentar`);
    return data.data;
  },
  async tambahKomentar(id: number, isi: string): Promise<KomentarKonten[]> {
    const { data } = await mahasiswaHttp.post<ApiResponse<KomentarKonten[]>>(`/mahasiswa-portal/elearning/${id}/komentar`, { isi });
    return data.data;
  },
  async hapusKomentar(komentarId: number) {
    await mahasiswaHttp.delete(`/mahasiswa-portal/elearning/komentar/${komentarId}`);
  },
  async list(): Promise<KontenMahasiswa[]> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KontenMahasiswa[]>>('/mahasiswa-portal/elearning');
    return data.data;
  },
  async detail(id: number): Promise<KontenMahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<KontenMahasiswa>>(`/mahasiswa-portal/elearning/${id}`);
    return data.data;
  },
  /** Tambah durasi aktif membuka konten (detik, maks 300 per ping). */
  async durasi(id: number, detik: number): Promise<void> {
    await mahasiswaHttp.post(`/mahasiswa-portal/elearning/${id}/durasi`, { detik });
  },
  async tandaiSelesai(id: number) {
    await mahasiswaHttp.post(`/mahasiswa-portal/elearning/${id}/selesai`);
  },
  /** Kumpulkan / perbarui jawaban tugas. lampiran: undefined = tidak diubah, null = hapus, data URL = ganti. */
  /** Simpan draf pengerjaan kuis (bisa dilanjutkan nanti / dari perangkat lain). */
  async simpanDraf(id: number, jawaban: Record<number, number | null>): Promise<{ disimpan: string; terjawab: number; jumlahSoal: number }> {
    const { data } = await mahasiswaHttp.put<ApiResponse<{ disimpan: string; terjawab: number; jumlahSoal: number }>>(`/mahasiswa-portal/elearning/${id}/draf`, { jawaban });
    return data.data;
  },
  async kumpulkanTugas(id: number, body: { isi: string | null; lampiran?: string | null; lampiranNama?: string | null }): Promise<string> {
    const { data } = await mahasiswaHttp.post<ApiResponse<unknown>>(`/mahasiswa-portal/elearning/${id}/tugas`, body);
    return data.message;
  },
  async kirim(id: number, jawaban: Record<number, number | null>): Promise<{ message: string; skor: number | null }> {
    const { data } = await mahasiswaHttp.post<ApiResponse<{ skor: number | null }>>(`/mahasiswa-portal/elearning/${id}/jawaban`, { jawaban });
    return { message: data.message, skor: data.data.skor };
  },
  /** Kuis berdurasi: mulai mengerjakan (waktu mulai dicatat server). */
  async mulaiKuis(id: number) {
    await mahasiswaHttp.post(`/mahasiswa-portal/elearning/${id}/mulai`);
  },
};

/** Saran isian kategori & tagline konten (boleh diisi teks lain). */
export const SARAN_KATEGORI = ['Kuliah', 'Praktikum', 'Tutorial', 'Studi Kasus', 'Pengayaan', 'Referensi', 'Latihan', 'Ujian'];
export const SARAN_TAGLINE = ['Wajib', 'Baru', 'Penting', 'Populer', 'Terlaris', 'Rekomendasi'];

/** Thumbnail video YouTube (hqdefault); null bila bukan link YouTube. */
export const youtubeThumbnail = (url: string | null | undefined): string | null => {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
};

/** Ubah link YouTube (watch / youtu.be / shorts) jadi URL embed; null bila bukan YouTube. */
/** Durasi detik → '1 j 2 mnt', '5 mnt 20 dtk', '45 dtk'; 0 → '-'. */
export const formatDurasi = (detik: number | null | undefined): string => {
  const d = Number(detik) || 0;
  if (!d) return '-';
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;
  return [j && `${j} j`, m && `${m} mnt`, !j && s && `${s} dtk`].filter(Boolean).join(' ');
};

export const youtubeEmbed = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

/**
 * Gambar sampul kartu daftar konten: materi = thumbnail gambar pertama, lalu thumbnail video YouTube pertama;
 * video = thumbnail YouTube. null = tanpa sampul (kartu memakai ikon).
 */
export const sampulKonten = (k: { jenis: JenisKonten; url?: string | null; sampul?: string | null; videoUrls?: string[] }): string | null => {
  if (k.jenis === 'VIDEO') return youtubeThumbnail(k.url);
  if (k.jenis !== 'MATERI') return null;
  return k.sampul || (k.videoUrls ?? []).map((v) => youtubeThumbnail(v)).find(Boolean) || null;
};

/** Link video materi yang diterima: YouTube atau Google Drive. */
export const LINK_VIDEO_MATERI = /^https?:\/\/((www\.|m\.)?youtube\.com\/|youtu\.be\/|drive\.google\.com\/)/i;

/** URL pemutar tertanam: YouTube, atau file Google Drive (…/file/d/<id>/… atau ?id=<id>) lewat /preview. */
export const videoEmbed = (url: string | null | undefined): string | null => {
  const yt = youtubeEmbed(url);
  if (yt || !url) return yt;
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
};
