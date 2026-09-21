export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ModuleCode = 'pmb' | 'baak' | 'sdi' | 'prodi' | 'keuangan' | 'sim';

export interface Menu {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  path: string | null;
  icon: string | null;
  orderNumber: number;
  isActive: boolean;
  isPublic: boolean;
  module: ModuleCode;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuTreeNode extends Menu {
  children: MenuTreeNode[];
}

export interface RoleMenuPermission {
  id: number;
  roleId: number;
  menuId: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  menu?: Menu;
}

export interface User {
  id: number;
  roleId: number;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  photo?: string | null;
  role?: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface GolonganKelas {
  id: number;
  namaKelas: string;
  isDelete: boolean;
  jurusanList?: Jurusan[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Jurusan {
  id: number;
  golonganKelasId: number;
  namaJurusan: string;
  kodeProdi: string | null;
  foto: string | null;
  prospekKarir: string | null;
  jenjangPendidikan: string | null;
  gelarSingkat: string | null;
  gelarLengkap: string | null;
  namaFakultas: string | null;
  isDelete: boolean;
  golonganKelas?: GolonganKelas;
  createdAt?: string;
  updatedAt?: string;
}

export interface SumberInformasi {
  id: number;
  namaInformasi: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UkuranAlmamater {
  id: number;
  ukuran: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pembayaran {
  id: number;
  namaPembayaran: string;
  isBeasiswa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DokumenPendaftaran {
  id: number;
  namaPendaftaran: string;
  isWajib: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DokumenKelengkapan {
  id: number;
  namaKelengkapan: string;
  isWajib: boolean;
  isBeasiswa: boolean;
  file?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Gelombang {
  id: number;
  namaGelombang: string;
  startDate: string;
  endDate: string;
  deskripsi: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type JenisKelamin = 'L' | 'P';

export interface PesertaBiodata {
  id: number;
  pesertaId: number;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
  agama: string;
  kewarganegaraan: string;
  nik: string;
  namaIbuKandung: string;
  jalan: string;
  rt: string;
  rw: string;
  desaKelurahan: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  kodePos: string;
  noWhatsapp: string;
  isAgree: boolean;
}

export type StatusUjian = 'belum_ujian' | 'lulus' | 'tidak_lulus';
export type StatusKelulusan = 'menunggu' | 'diterima' | 'ditolak';

export interface Peserta {
  id: number;
  namaLengkap: string;
  asalSekolah: string;
  golonganKelasId: number;
  jurusanId: number;
  noTelepon: string;
  email: string;
  isActive: boolean;
  statusUjian: StatusUjian;
  statusKelulusan: StatusKelulusan;
  golonganKelas?: GolonganKelas;
  jurusan?: Jurusan;
  biodata?: PesertaBiodata | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PesertaDokumenUpload {
  id: number;
  fileName: string;
  file: string;
  updatedAt: string;
}

export interface PesertaDokumenStatus {
  dokumenKelengkapanId: number;
  namaKelengkapan: string;
  isWajib: boolean;
  isBeasiswa: boolean;
  upload: PesertaDokumenUpload | null;
}

export interface Kampus {
  id: number;
  namaKampus: string;
  alamat: string | null;
  telepon: string | null;
  kodePos: string | null;
  email: string | null;
  whatsappNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  websiteTitle: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeImage {
  id: number;
  heroImage: string | null;
  programStudiImage: string | null;
  kehidupanKampusImage: string | null;
  fasilitasLabImage: string | null;
  fasilitasGedungImage: string | null;
  fasilitasAulaImage: string | null;
  beasiswaSlide1Image: string | null;
  beasiswaSlide2Image: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Beasiswa {
  id: number;
  namaBeasiswa: string;
  slug: string;
  ringkasan: string | null;
  konten?: string | null;
  orderNumber: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BiayaKuliah {
  id: number;
  judul: string;
  slug: string;
  ringkasan: string | null;
  konten?: string | null;
  orderNumber: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SkemaPembiayaan = 'beasiswa' | 'mandiri';
export type StatusBeasiswa = 'diusulkan' | 'disetujui' | 'ditolak';
export type StatusKuliah = 'menunggu' | 'diterima' | 'ditolak';

export interface CalonMahasiswa {
  id: number;
  nama: string;
  asalSekolah: string;
  prodi: string;
  gelombangId: number | null;
  gelombang?: Gelombang | null;
  pesertaId: number | null;
  peserta?: Pick<Peserta, 'id' | 'namaLengkap' | 'email' | 'statusUjian' | 'statusKelulusan'> | null;
  noTelepon: string | null;
  skemaPembiayaan: SkemaPembiayaan;
  formulirPendaftaran: boolean;
  lulusTesMasuk: boolean;
  akunBeasiswa: boolean | null;
  kelengkapanPersyaratan: boolean;
  statusBeasiswa: StatusBeasiswa | null;
  statusKuliah: StatusKuliah;
  createdAt?: string;
  updatedAt?: string;
}

export interface MahasiswaBiodata {
  id: number;
  mahasiswaId: number;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: 'L' | 'P' | null;
  agama: string | null;
  kewarganegaraan: string | null;
  noKtp: string | null;
  nisn: string | null;
  jalurPendaftaran: string | null;
  npwp: string | null;
  jenisPendaftaran: string | null;
  tanggalMasukKuliah: string | null;
  mulaiSemester: string | null;
  jalan: string | null;
  dusun: string | null;
  rt: string | null;
  rw: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kodePos: string | null;
  propinsi: string | null;
  jenisTinggal: string | null;
  alatTransportasi: string | null;
  teleponRumah: string | null;
  kelas: string | null;
  programStudi: string | null;
  waktuKuliah: string | null;
  statusBelajar: string | null;
  statusKuliah: string | null;
  statusDikti: string | null;
  email: string | null;
  hp: string | null;
  almamater: string | null;
  terimaKps: string | null;
  noKps: string | null;
  nikAyah: string | null;
  namaAyah: string | null;
  tanggalLahirAyah: string | null;
  pendidikanAyah: string | null;
  pekerjaanAyah: string | null;
  penghasilanAyah: string | null;
  nikIbu: string | null;
  namaIbu: string | null;
  tanggalLahirIbu: string | null;
  pendidikanIbu: string | null;
  pekerjaanIbu: string | null;
  penghasilanIbu: string | null;
  namaWali: string | null;
  tanggalLahirWali: string | null;
  pendidikanWali: string | null;
  pekerjaanWali: string | null;
  penghasilanWali: string | null;
  jenisPembiayaan: string | null;
  biayaMasuk: number | null;
  sksDiakui: number | null;
  perguruanTinggiAsal: string | null;
  programStudiAsal: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusMasukMahasiswa =
  | 'BARU'
  | 'TRANSFER_LUAR'
  | 'TRANSFER_DALAM'
  | 'TRANSFER_LUAR_KARYAWAN'
  | 'TRANSFER_DALAM_KARYAWAN';

export type StatusKeluarMahasiswa =
  | 'CUTI'
  | 'MENGUNDURKAN_DIRI'
  | 'DROP_OUT'
  | 'HABIS_MASA_STUDI'
  | 'MUTASI'
  | 'PUTUS_SEKOLAH'
  | 'WAFAT'
  | 'HILANG'
  | 'LAINNYA';

export interface TahunAjaran {
  id: number;
  nama: string;
  tahunMulai: number;
  tahunSelesai: number;
  jenisSemester: SemesterGanjilGenap;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Mahasiswa {
  id: number;
  nim: string;
  pesertaId: number | null;
  namaLengkap: string;
  email: string;
  noTelepon: string | null;
  asalSekolah: string | null;
  alamat: string | null;
  golonganKelasId: number;
  jurusanId: number;
  tahunMasuk: number;
  tahunAjaranId: number | null;
  urutan: number;
  statusMasuk: StatusMasukMahasiswa;
  // Hanya relevan untuk statusMasuk TRANSFER_* — semester awal saat transfer diterima
  // (hasil SK penyetaraan/konversi SKS dari kampus/prodi asal), input manual akademik/prodi.
  semesterDiakui: number | null;
  // Input manual akademik/prodi (tidak ada riwayat cuti per semester di sistem ini) — dipakai
  // untuk mengurangi hitungan semester berjalan otomatis di KRS.
  jumlahSemesterCuti: number;
  // Koreksi manual kasus khusus per mahasiswa — kalau diisi, MENGGANTIKAN hasil hitungan
  // otomatis (bukan ikut dihitung). Null berarti tetap pakai hitungan otomatis.
  semesterOverride: number | null;
  isActive: boolean;
  statusKeluar: StatusKeluarMahasiswa | null;
  tanggalKeluar: string | null;
  alasanKeluar: string | null;
  photo?: string | null;
  golonganKelas?: GolonganKelas;
  jurusan?: Jurusan;
  tahunAjaran?: TahunAjaran | null;
  peserta?: Pick<Peserta, 'id' | 'namaLengkap' | 'email'>;
  biodata?: MahasiswaBiodata | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Karyawan {
  id: number;
  nip: string;
  idFinger: string | null;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: 'L' | 'P' | null;
  pendidikanAkhir: string | null;
  agama: string | null;
  telpHp: string | null;
  email: string | null;
  alamat: string | null;
  bagian: string | null;
  jabatan: string | null;
  status: string | null;
  tmt: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type DinasCutiStatus = 'DINAS_LUAR' | 'CUTI' | 'LUPA_KEHADIRAN' | 'CUTI_SPESIAL' | 'CUTI_BERSAMA';

export interface DinasCutiLupaFinger {
  id: number;
  karyawanId: number;
  karyawan: Pick<Karyawan, 'id' | 'nip' | 'namaLengkap' | 'bagian' | 'jabatan'> | null;
  tanggalKehadiran: string;
  status: DinasCutiStatus;
  keperluan: string | null;
  lampiranNama: string | null;
  lampiran: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface KaryawanGenderSummary {
  lakiLaki: number;
  perempuan: number;
}

export interface EligibleSummaryItem {
  jurusanId: number;
  namaJurusan: string;
  total: number;
}

export interface CalonMahasiswaStats {
  totalPendaftar: number;
  diterimaKuliah: number;
  ditolak: number;
  jalurBeasiswa: number;
  beasiswaDiterima: number;
}

export type AuditActorType = 'staff' | 'peserta' | 'public';

export interface AuditLog {
  id: number;
  actorType: AuditActorType;
  actorId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  method: string;
  module: string;
  action: string;
  path: string;
  description: string;
  statusCode: number;
  ipAddress: string | null;
  changes: string | null;
  createdAt: string;
}

export interface AuditLogSnapshot {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface MeResult {
  user: User;
  permissions: RoleMenuPermission[];
}

export type KelompokFakultas = 'FKF' | 'FTID' | 'FIP' | 'NON_BASE';

export interface Dosen {
  id: number;
  nik: string | null;
  nidn: string;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: 'L' | 'P' | null;
  pendidikanAkhir: string | null;
  agama: string | null;
  telpHp: string | null;
  email: string | null;
  alamat: string | null;
  statusDosen: 'TETAP' | 'TIDAK_TETAP' | null;
  status: string | null;
  waktu: 'M' | 'P' | null;
  tmt: string | null;
  karyawanInternal: boolean;
  infaq: boolean;
  kelompokFakultas: KelompokFakultas;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HonorUjianPembayaran {
  id: number;
  dosenId: number;
  nominal: number;
  tanggalBayar: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DosenHonorUjian extends Dosen {
  lastPayment: HonorUjianPembayaran | null;
}

export interface DosenStatItem {
  kelompokFakultas: KelompokFakultas;
  total: number;
}

export type HariKuliah = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU';

export interface JadwalKuliah {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  sksTeori: number;
  sksPraktik: number;
  sksLab: number;
  dosenKordinatorId: number;
  dosenKordinator?: Dosen;
  dosenPengampu?: Dosen[];
  tahunAjaranId: number | null;
  tahunAjaran?: TahunAjaran | null;
  mataKuliahId: number | null;
  mataKuliah?: MataKuliah | null;
  semester: number | null;
  hari: HariKuliah[] | null;
  jam: number | null;
  ruangan: string | null;
  gcr: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusKehadiranDosen = 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT';

export interface KehadiranDosen {
  id: number;
  jadwalKuliahId: number;
  jadwalKuliah?: JadwalKuliah;
  dosenId: number;
  dosen?: Dosen;
  tanggalRealisasi: string;
  status: StatusKehadiranDosen;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NilaiMahasiswaMahasiswa {
  id: number;
  nim: string;
  namaLengkap: string;
  kelas: string;
  programStudi: string | null;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface NilaiMahasiswaEntry {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Pick<Mahasiswa, 'id' | 'nim' | 'namaLengkap'>;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number;
  semester: number;
  partisipatif: number;
  proyek: number;
  quiz: number;
  tugas: number;
  uts: number;
  uas: number;
  nilai: number;
  grade: Grade;
  createdAt?: string;
  updatedAt?: string;
}

export interface NilaiMahasiswaDetail {
  mahasiswa: NilaiMahasiswaMahasiswa;
  nilai: NilaiMahasiswaEntry[];
}

export interface Yudisium {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  noSk: string | null;
  tanggalSk: string | null;
  tanggalYudisium: string | null;
  pin: string | null;
  judul: string | null;
  pembimbing1Id: number | null;
  pembimbing1?: Dosen;
  pembimbing2Id: number | null;
  pembimbing2?: Dosen;
  ipk?: number;
  predikat?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SemesterSummaryItem {
  semester: number;
  rataRata: number;
  total: number;
}

export interface KehadiranStatusSummaryItem {
  status: StatusKehadiranDosen;
  total: number;
}

export interface LulusanItem {
  id: number;
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  namaJurusan: string | null;
  tahunMasuk: number | null;
  statusMasuk: StatusMasukMahasiswa | null;
  totalSks: number;
  ipk: number;
  predikat: string | null;
  noSk: string | null;
  tanggalYudisium: string | null;
}

export interface CetakDokumenNilai {
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number;
  semester: number;
  mutu: number;
  grade: string;
}

export interface CetakDokumenData {
  mahasiswa: {
    id: number;
    nim: string;
    namaLengkap: string;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    noKtp: string | null;
  };
  jurusan: {
    namaJurusan: string;
    jenjangPendidikan: string | null;
    gelarSingkat: string | null;
    gelarLengkap: string | null;
    namaFakultas: string | null;
  } | null;
  yudisium: {
    noSk: string | null;
    tanggalSk: string | null;
    tanggalYudisium: string | null;
    pin: string | null;
    judul: string | null;
    pembimbing1: string | null;
    pembimbing2: string | null;
  };
  nilai: CetakDokumenNilai[];
  totalSks: number;
  totalBobot: number;
  ipk: number;
}

export type JenisCetakIjazah = 'ijazah' | 'ijazah-duplikat' | 'transkrip' | 'surat-keterangan-lulus' | 'skpi';

export type JenisSurat =
  | 'AKTIF_KULIAH'
  | 'LULUS_MENUNGGU_IJAZAH'
  | 'OBSERVASI'
  | 'KKP'
  | 'REKOMENDASI_KAMPUS_MERDEKA'
  | 'UJIAN_UAS';

export type StatusSuratKeterangan = 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';

export interface SuratKeterangan {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Pick<Mahasiswa, 'id' | 'nim' | 'namaLengkap'>;
  jenisSurat: JenisSurat;
  nomorSurat: string | null;
  tanggalInput: string;
  semester: number | null;
  alasan: string | null;
  namaInstansi: string | null;
  alamatInstansi: string | null;
  ipk: number | null;
  jumlahSks: number | null;
  namaKoordinator: string | null;
  noHpKoordinator: string | null;
  tanggalUjianMulai: string | null;
  tanggalUjianSelesai: string | null;
  status: StatusSuratKeterangan;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuratKeteranganCetakData {
  surat: {
    id: number;
    jenisSurat: JenisSurat;
    nomorSurat: string | null;
    tanggalInput: string;
    semester: number | null;
    alasan: string | null;
    namaInstansi: string | null;
    alamatInstansi: string | null;
    ipk: number | null;
    jumlahSks: number | null;
    namaKoordinator: string | null;
    noHpKoordinator: string | null;
    tanggalUjianMulai: string | null;
    tanggalUjianSelesai: string | null;
  };
  mahasiswa: {
    id: number;
    nim: string;
    namaLengkap: string;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    noKtp: string | null;
    alamat: string | null;
  };
  jurusan: {
    namaJurusan: string;
    namaFakultas: string | null;
    jenjangPendidikan: string | null;
  } | null;
}

export interface RealisasiMengajarItem {
  id: number;
  hariJam: string;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  dosen: string | null;
  jam: number | null;
  ruangan: string | null;
  realisasi: number;
}

export interface KhsMahasiswaItem {
  id: number;
  nim: string;
  namaLengkap: string;
  kelas: string;
  semesterOptions: number[];
}

export interface MahasiswaPerkelasFilterOptions {
  prodi: { id: number; namaJurusan: string; kodeProdi: string | null }[];
  kelas: string[];
  waktuKuliah: string[];
  tahunMasuk: number[];
}

export type SyncFingerMesin = 'A1' | 'A2';
export type SyncFingerStatus = 'PENDING' | 'PROCESSED';

export interface SyncFingerLog {
  id: number;
  mesin: SyncFingerMesin;
  nik: string;
  tanggal: string;
  karyawanId: number | null;
  karyawan: { id: number; namaLengkap: string; nip: string } | null;
  status: SyncFingerStatus;
  processedAt: string | null;
  createdAt: string;
}

export interface SyncFingerPullResult {
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

export interface SyncFingerInsertResult {
  processedCount: number;
  matchedCount: number;
  unmatchedCount: number;
}

export interface MataKuliah {
  id: number;
  kodeMk: string;
  namaMk: string;
  sks: number;
  createdAt?: string;
  updatedAt?: string;
}

// ---- Portal Dosen (self-service, auth & data terpisah dari sistem User/Role admin) ----

export interface DosenPortalJadwal {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  ruangan: string | null;
  mataKuliah?: MataKuliah | null;
}

export interface RealisasiMengajar {
  id: number;
  jadwalKuliahId: number;
  jadwalKuliah?: DosenPortalJadwal;
  dosenId: number;
  tanggalRealisasi: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  pertemuanKe: number | null;
  status: StatusKehadiranDosen;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RekapMahasiswaRow {
  id: number;
  nim: string | null;
  namaLengkap: string | null;
}

export type StatusKehadiranMahasiswa = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';

export interface PresensiMahasiswaRow {
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  status: StatusKehadiranMahasiswa | null;
  keterangan: string | null;
}

export interface SavePresensiMahasiswaItem {
  mahasiswaId: number;
  status: StatusKehadiranMahasiswa;
  keterangan?: string | null;
}

export interface SilabusMatakuliahRow {
  kodeMk: string;
  namaMk: string;
  sks: number | null;
  silabus: string | null;
}

export type StatusKrs = 'DRAFT' | 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';

export interface KrsDetail {
  id: number;
  krsId: number;
  jadwalKuliahId: number;
  kelasKuliah?: JadwalKuliah;
}

export interface Krs {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  semester: number;
  tahunAjaranId: number;
  tahunAjaran?: TahunAjaran;
  status: StatusKrs;
  detailList?: KrsDetail[];
  totalSks?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ---- Portal Mahasiswa (self-service, auth & data terpisah dari sistem User/Role admin) ----

export interface NilaiKhsEntry {
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number;
  nilai: number;
  grade: string;
  bobot: number;
  mutu: number;
}

export interface KhsSemester {
  semester: number;
  nilai: NilaiKhsEntry[];
  totalSks: number;
  totalMutu: number;
  ipSemester: number;
}

export interface Transkrip {
  perSemester: KhsSemester[];
  totalSks: number;
  ipk: number;
}

// ---- Prodi: Evaluasi Studi ----

export interface EvaluasiStudiTahap {
  berlaku: boolean;
  memenuhi: boolean;
  minSks: number;
  minIpk: number;
}

export interface EvaluasiStudiRow {
  /** Alias mahasiswaId — ditambahkan di sisi frontend (lihat api/evaluasiStudi.ts) supaya
   * cocok dengan constraint {id:number} yang dipakai useCrudPage/DataTable. */
  id: number;
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  prodi: string;
  golonganKelas: string;
  semester: number;
  ipk: number;
  sksTanpaE: number;
  sksTanpaDE: number;
  maxSemesterWajar: number;
  tahap1: EvaluasiStudiTahap;
  tahap2: EvaluasiStudiTahap;
  melebihiMasaStudi: boolean;
  bermasalah: boolean;
}

// ---- SIM: Student Body ----

export interface StudentBodyRow {
  tahunMasuk: number;
  terdaftarBaru: number;
  terdaftarAlih: number;
  terdaftarJumlah: number;
  lulusBaru: number;
  lulusAlih: number;
  lulusJumlah: number;
  kdoBaru: number;
  kdoAlih: number;
  kdoJumlah: number;
  jumlah: number;
}

export interface StudentBodyGroup {
  namaJurusan: string;
  rows: StudentBodyRow[];
  total: number;
}

export interface PresentaseKehadiranRow {
  tahunAkademik: number;
  semester: SemesterGanjilGenap;
  prodi: string;
  rataRataKehadiran: number;
}

export interface KehadiranKelasRow {
  mataKuliah: string;
  kodeMataKuliah: string;
  kelas: string;
  rataRataKehadiranPersentase: number;
}

export interface LaporanFrsRow {
  tahunAkademik: number;
  semester: SemesterGanjilGenap;
  prodi: string;
  reguler: number;
  pindahanRpl: number;
  jumlah: number;
}

export interface LaporanIpkRow {
  tahunAkademik: number;
  semester: SemesterGanjilGenap;
  prodi: string;
  jumlahMahasiswa: number;
  rataRataIpk: number;
  rataRataIps: number;
}

export interface NilaiDERow {
  prodi: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number;
  grade: 'D' | 'E';
  jumlah: number;
}

export interface LaporanAktifCounters {
  baruReguler: number;
  baruKaryawan: number;
  baruJumlah: number;
  pindahReguler: number;
  pindahKaryawan: number;
  pindahJumlah: number;
  total: number;
}

export interface LaporanAktifRow extends LaporanAktifCounters {
  smt: number;
}

export interface LaporanAktifGroup {
  namaJurusan: string;
  kodeProdi: string | null;
  rows: LaporanAktifRow[];
  subtotal: LaporanAktifCounters;
}

export type JenisUjian = 'UTS' | 'UAS';

export interface LaporanUjianRow {
  prodi: string;
  jumlah: number;
}

export interface LaporanLulusanRow {
  tahunLulus: number;
  jurusan: string;
  nim: string;
  nama: string;
  ipk: number;
  predikat: string | null;
  lamaStudiSemester: number | null;
}

export interface ProdiOption {
  id: number;
  namaJurusan: string;
}

export interface KehadiranMengajarRow {
  id: number;
  tanggalRealisasi: string;
  status: StatusKehadiranDosen;
  jamMasuk: string | null;
  jamKeluar: string | null;
  pertemuanKe: number | null;
  dosen: { id: number; nidn: string; namaLengkap: string };
  jadwalKuliah: {
    id: number;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    mataKuliah?: { id: number; kodeMk: string; namaMk: string } | null;
    tahunAjaran?: { id: number; nama: string } | null;
  };
}

export interface RekapitulasiPengajaranRow {
  dosenId: number;
  nidn: string;
  namaLengkap: string;
  hadir: number;
  tidakHadir: number;
  izin: number;
  sakit: number;
  totalPertemuan: number;
}

// ---- Keuangan: Tagihan Kuliah / Pembayaran Kuliah / Perpanjangan TA-Skripsi ----

export interface PembayaranKuliah {
  id: number;
  tagihanKuliahId: number;
  tagihan?: TagihanKuliah;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank: string | null;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagihanKuliah {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tahunAjaranId: number;
  tahunAjaran?: TahunAjaran;
  semester: number;
  sksDiambil: number;
  hargaPerSks: number;
  biayaSks: number;
  biayaBpp: number;
  biayaSpp: number;
  potongan: number;
  totalTagihan: number;
  totalDibayar: number;
  sisaTagihan: number;
  pembayaranList?: PembayaranKuliah[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateTagihanResult {
  generated: number;
  updated: number;
  skippedCount: number;
  skipped: { mahasiswaId: number; nim: string; alasan: string }[];
}

export interface PerpanjanganTaSkripsi {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  periode: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank: string | null;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PembayaranTaSkripsi {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  periode: number;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank: string | null;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LaporanTunggakanRow {
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  prodi: string;
  tagihanSisa: number;
  tunggakanManual: number;
  tagihanTaSkripsisSisa: number;
  tagihanBiayaLainSisa: number;
  totalTunggakan: number;
}

export interface RingkasanTaSkripsiJenis {
  tarif: number;
  dibayar: number;
  sisa: number;
}

export interface RingkasanTaSkripsiPeriode {
  periode: number;
  mahasiswaId: number;
  pendaftaran: RingkasanTaSkripsiJenis;
  perpanjangan: RingkasanTaSkripsiJenis | null;
  pembayaranList: PembayaranTaSkripsi[];
  perpanjanganList: PerpanjanganTaSkripsi[];
}

export interface RingkasanBiayaLainRow {
  tarifLainId: number;
  mahasiswaId: number;
  kodeBiaya: string;
  keterangan: string | null;
  tarif: number;
  dibayar: number;
  sisa: number;
}

export interface PembayaranLain {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tarifLainId: number;
  tarifLain?: TarifLain;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank: string | null;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LaporanUangKuliahRow {
  prodi: string;
  jumlahMahasiswa: number;
  totalTagihan: number;
  totalDibayar: number;
  totalTunggakan: number;
}

export interface PembayaranSp {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tanggalBayar: string;
  noBukti: string;
  nominal: number;
  kodeBank: string | null;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LaporanTunggakanJurusanRow {
  prodi: string;
  jumlahMahasiswa: number;
  tagihanSisa: number;
  tagihanTaSkripsisSisa: number;
  tagihanBiayaLainSisa: number;
  tunggakanManual: number;
  totalTunggakan: number;
}

export interface LaporanSertifikasiRow {
  jenisPembayaran: string;
  jumlahTransaksi: number;
  totalNominal: number;
}

// ---- Keuangan: Dashboard Kasir ----
export interface KasirDashboardSummary {
  jumlahTransaksi: number;
  totalNominal: number;
}

export interface KasirDashboardTunggakan {
  totalTunggakan: number;
  jumlahMahasiswaMenunggak: number;
}

export interface KasirDashboardTrendPoint {
  label: string;
  value: number;
  jumlahTransaksi: number;
}

export interface KasirDashboardBreakdown {
  label: string;
  value: number;
}

export interface KasirTransaksi {
  id: string;
  jenis: 'KULIAH' | 'SERTIFIKASI' | 'WISUDA' | 'PERPANJANGAN_TA';
  jenisLabel: string;
  tanggalBayar: string;
  createdAt: string;
  noBukti: string;
  nominal: number;
  kodeBank: string | null;
  nim: string;
  namaLengkap: string;
  kasir: string;
}

export interface KasirDashboard {
  hariIni: KasirDashboardSummary;
  bulanIni: KasirDashboardSummary;
  tunggakan: KasirDashboardTunggakan;
  trend14Hari: KasirDashboardTrendPoint[];
  breakdownJenis: KasirDashboardBreakdown[];
  breakdownBank: KasirDashboardBreakdown[];
  transaksiTerbaru: KasirTransaksi[];
}

// ---- Keuangan: Akuntansi (Buku Besar & Neraca — PSAK sederhana) ----

export type KategoriAkun = 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';

export interface Akun {
  id: number;
  kode: string;
  nama: string;
  kategori: KategoriAkun;
  saldoNormal: 'DEBIT' | 'KREDIT';
  isActive: boolean;
}

export interface MutasiBukuBesar {
  tanggal: string;
  noBukti: string | null;
  keterangan: string | null;
  debit: number;
  kredit: number;
  saldo: number;
}

export interface BukuBesarData {
  akun: Pick<Akun, 'id' | 'kode' | 'nama' | 'kategori' | 'saldoNormal'>;
  mutasi: MutasiBukuBesar[];
  saldoAkhir: number;
}

export interface NeracaAkunSaldo {
  id: number;
  kode: string;
  nama: string;
  kategori: KategoriAkun;
  saldo: number;
}

export interface NeracaData {
  aset: NeracaAkunSaldo[];
  totalAset: number;
  kewajiban: NeracaAkunSaldo[];
  totalKewajiban: number;
  ekuitas: NeracaAkunSaldo[];
  labaBerjalan: number;
  totalEkuitas: number;
  isBalance: boolean;
}

export interface TarifTaSkripsi {
  id: number;
  periode: number;
  jurusanId: number;
  jurusan?: Jurusan;
  biayaPendaftaran: number;
  biayaPerpanjangan: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TarifPembimbing {
  id: number;
  periode: number;
  jurusanId: number;
  jurusan?: Jurusan;
  biayaPembimbingUtama: number;
  biayaPembimbingPendamping: number;
  biayaPembimbingAsisten: number;
  biayaPembimbingTunggal: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TarifLain {
  id: number;
  kodeBiaya: string;
  tahunMasuk: number;
  tahunAkademik: string | null;
  biaya: number;
  keterangan: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusBelajarKuliah = 'BARU' | 'LAMA' | 'KARYAWAN' | 'BARU KARYAWAN';

export interface TarifKuliah {
  id: number;
  jurusanId: number;
  jurusan?: Jurusan;
  tahunAngkatan: number;
  periode?: string | null;
  semester: number;
  biayaSks: number;
  biayaBpp: number;
  biayaSpp: number;
  statusBelajar: StatusBelajarKuliah;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusKeringanan = 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK';

export interface Keringanan {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tanggal: string;
  totalTagihan: number | null;
  jumlahBayar: number;
  alasan: string | null;
  status: StatusKeringanan;
  createdAt?: string;
  updatedAt?: string;
}

export interface TunggakanMahasiswa {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tanggal: string;
  nominal: number;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DaftarPotongan {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  biaya: number;
  semester: number | null;
  alasan: string | null;
  asal: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusSertifikasi = 'MENUNGGU' | 'LULUS' | 'TIDAK_LULUS';

export interface PembayaranSertifikasi {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tanggalBayar: string;
  noBukti: string;
  jenisPembayaran: string;
  caraPembayaran: string;
  tanggalPelaksanaan: string | null;
  waktuPelaksanaan: string | null;
  bayar: number;
  kodeBank: string | null;
  keterangan: string | null;
  statusSertifikasi: StatusSertifikasi;
  buktiPembayaran: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PembayaranWisuda {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tanggalBayar: string;
  noBukti: string;
  semester: number | null;
  periode: string;
  bayar: number;
  kodeBank: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SemesterGanjilGenap = 'GANJIL' | 'GENAP';

export interface JadwalSidang {
  id: number;
  tahunAjaranId: number;
  tahunAjaran?: Pick<TahunAjaran, 'id' | 'nama'>;
  semester: SemesterGanjilGenap;
  jurusanId: number;
  jurusan?: Pick<Jurusan, 'id' | 'namaJurusan' | 'kodeProdi'>;
  tanggal: string;
  jam: string;
  ruangan: string | null;
  noSk: string | null;
  dosenPengujiId: number | null;
  dosenPenguji?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendaftarSidang {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Pick<Mahasiswa, 'id' | 'nim' | 'namaLengkap' | 'noTelepon'>;
  jadwalSidangId: number | null;
  jadwalSidang?:
    | (Pick<JadwalSidang, 'id' | 'tanggal' | 'jam' | 'ruangan' | 'noSk'> & {
        dosenPenguji?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
      })
    | null;
  judul: string;
  pembimbing1Id: number | null;
  pembimbing1?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
  pembimbing2Id: number | null;
  pembimbing2?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PembimbingMagang {
  id: number;
  dosenId: number;
  dosen?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
  noSk: string | null;
  tanggalSk: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PembimbingAkademik {
  id: number;
  dosenId: number;
  dosen?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
  noSk: string | null;
  tanggalSk: string | null;
  jumlahMahasiswa: number;
  prodi: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NilaiPerkelasItem {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  dosen: string | null;
  jmlFrs: number;
  jmlUts: number;
  jmlUas: number;
}

export interface NilaiPerkelasRosterItem {
  mahasiswaId: number;
  nim: string;
  namaLengkap: string;
  uts: number | null;
  uas: number | null;
  nilaiAkhir: number | null;
  grade: string | null;
}

export interface NilaiPerkelasDetail {
  jadwal: {
    id: number;
    kelas: string;
    kodeMataKuliah: string;
    namaMataKuliah: string;
    dosen: string | null;
  };
  roster: NilaiPerkelasRosterItem[];
}

export type PembimbingKe = 'UTAMA' | 'PENDAMPING';

export interface PembimbingTaSkripsi {
  id: number;
  dosenId: number;
  dosen?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
  noSk: string | null;
  tanggalSk: string | null;
  pembimbingKe: PembimbingKe;
  periodeMulai: string;
  periodeSelesai: string;
  totalBimbingan: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BimbinganMagang {
  id: number;
  mahasiswaId: number;
  mahasiswa?: Pick<Mahasiswa, 'id' | 'nim' | 'namaLengkap'> | null;
  pembimbingMagangId: number | null;
  pembimbingMagang?: (Pick<PembimbingMagang, 'id'> & { dosen?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null }) | null;
  judul: string | null;
  nilai: string | null;
  kelas: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VocDosenFtidRow {
  jadwalKuliahId: number;
  namaMataKuliah: string;
  kelas: string;
  rencanaPengawas: string;
  ruangan: string | null;
  jumlah: number;
  tanggalBerkas: string | null;
  pengawasRealId: number | null;
  pengawasReal: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null;
}

export interface VocDosenFtidDetail {
  dosen: Pick<Dosen, 'id' | 'nidn' | 'namaLengkap'>;
  rows: VocDosenFtidRow[];
}

export interface VocUjianFtidItem extends Pick<Dosen, 'id' | 'nidn' | 'namaLengkap'> {
  vocUjianFtid: { id: number; nominal: number; paidAt: string | null } | null;
}

export type KelompokMataKuliah = 'MPK' | 'MKK' | 'MKB' | 'MPB' | 'MBB';
export type KelompokKurikulum = 'WAJIB' | 'PILIHAN';
export type JenisMataKuliah = 'TEORI' | 'PRAKTIK' | 'TEORI_PRAKTIK';
export type KelompokKompetensi = 'UTAMA' | 'PENDUKUNG' | 'LAINNYA';

export interface Kurikulum {
  id: number;
  jurusanId: number | null;
  tahunAjaranId: number | null;
  kode: string;
  mataKuliah: string;
  mataKuliahEn: string | null;
  kelompokMataKuliah: KelompokMataKuliah | null;
  kelompokKurikulum: KelompokKurikulum | null;
  jenisMataKuliah: JenisMataKuliah | null;
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksSimulasi: number;
  sksTotal: number;
  kelompokKompetensi: KelompokKompetensi | null;
  kompIlmuKomputer: string | null;
  mataKuliahMinat: string | null;
  muatanMataKuliah: string | null;
  metodePembelajaran: string | null;
  tanggalMulaiEfektif: string | null;
  tanggalAkhirEfektif: string | null;
  idMatkul: string | null;
  semester: number | null;
  jurusan?: Jurusan;
  tahunAjaran?: TahunAjaran | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface KurikulumIdentifier {
  jurusanId: number;
  tahunAjaranId: number;
}

export interface KonversiKurikulumRow {
  dariKurikulum: Kurikulum;
  keKurikulumId: number | null;
  keKurikulum: Kurikulum | null;
}

export interface KonversiKurikulumList {
  rows: KonversiKurikulumRow[];
  keOptions: Kurikulum[];
}

export interface BiodataMahasiswaItem {
  id: number;
  nim: string;
  namaLengkap: string;
  statusMasuk: StatusMasukMahasiswa;
  biodata: MahasiswaBiodata | null;
  jurusan: { id: number; namaJurusan: string; kodeProdi: string | null } | null;
}
