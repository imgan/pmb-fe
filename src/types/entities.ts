export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ModuleCode = 'pmb' | 'baak' | 'sdi' | 'prodi' | 'keuangan' | 'sim' | 'admin' | 'lms';

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
  kodeProdi?: string | null;
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
  /** Singkatan prodi untuk nama kelas (BAAK > Generate NIM), mis. TI. */
  singkatan?: string | null;
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

export interface Pengumuman {
  id: number;
  judul: string;
  /** Sasaran: portal mahasiswa, portal dosen, atau keduanya. */
  untuk: 'SEMUA' | 'MAHASISWA' | 'DOSEN';
  /** HTML dari editor teks BAAK. */
  isi: string;
  /** null = semua prodi. */
  jurusanId: number | null;
  jurusan?: { id: number; namaJurusan: string } | null;
  tanggalTerbit: string;
  tanggalBerakhir: string | null;
  isPenting: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Agama {
  id: number;
  kodeAgama: string;
  namaAgama: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ruangan {
  id: number;
  namaRuang: string;
  kampus: string | null;
  lantai: number | null;
  projector: boolean;
  keterangan: string | null;
  fungsi: string | null;
  kursi: number | null;
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
  /** Tahun Ajaran PMB gelombang (opsional). */
  tahunPmbId?: number | null;
  tahunPmb?: { id: number; nama: string; jenisSemester: SemesterGanjilGenap; isActive: boolean } | null;
  startDate: string;
  endDate: string;
  deskripsi: string | null;
  /** OTOMATIS = aktif sesuai rentang tanggal; AKTIF / TIDAK_AKTIF = diatur manual admin. */
  status?: StatusGelombang;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusGelombang = 'OTOMATIS' | 'AKTIF' | 'TIDAK_AKTIF';

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
  /** Data Pendidikan (nama asal sekolah ada di Peserta.asalSekolah). */
  jurusanSekolah?: string | null;
  tahunLulus?: string | null;
  jenisPengelolaanSekolah?: string | null;
  alamatSekolah?: string | null;
  nisn?: string | null;
  isAgree: boolean;
  /** true = peserta tidak bisa mengubah biodata sampai admin membuka kunci. */
  isLocked?: boolean;
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
  /** true = masih memakai password awal (nomor HP) → wajib ganti saat login. */
  wajibGantiPassword?: boolean;
  statusUjian: StatusUjian;
  statusKelulusan: StatusKelulusan;
  tahunPmbId?: number | null;
  sumberInformasiId?: number | null;
  /** Minat jalur pendaftaran; null = Pembiayaan Mandiri. */
  beasiswaId?: number | null;
  golonganKelas?: GolonganKelas;
  jurusan?: Jurusan;
  sumberInformasi?: { id: number; namaInformasi: string } | null;
  beasiswa?: { id: number; namaBeasiswa: string } | null;
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
  tiktokUrl: string | null;
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
  peserta?:
    | (Pick<Peserta, 'id' | 'namaLengkap' | 'email' | 'noTelepon' | 'wajibGantiPassword' | 'statusUjian' | 'statusKelulusan' | 'sumberInformasiId' | 'sumberInformasi' | 'golonganKelasId' | 'jurusanId' | 'beasiswaId'> & {
        /** Data pendidikan di biodata peserta (null = belum ada biodata). */
        biodata?: Pick<PesertaBiodata, 'id' | 'jurusanSekolah' | 'tahunLulus' | 'jenisPengelolaanSekolah' | 'alamatSekolah' | 'nisn'> | null;
      })
    | null;
  noTelepon: string | null;
  /** Popup Sumber Informasi: sumber info kampus, keterangan, kode unik; terkunci = hanya bisa dibaca. */
  sumberInformasiId?: number | null;
  sumberInformasi?: { id: number; namaInformasi: string } | null;
  keteranganSumber?: string | null;
  kodeUnik?: string | null;
  sumberTerkunci?: boolean;
  /** Popup Sumber Informasi 2: kelas perkuliahan, beasiswa, ukuran almamater, jurusan pilihan 1–3; terkunci = hanya bisa dibaca. */
  golonganKelasId?: number | null;
  golonganKelas?: { id: number; namaKelas: string } | null;
  beasiswaId?: number | null;
  beasiswa?: { id: number; namaBeasiswa: string } | null;
  ukuranAlmamater?: string | null;
  jurusan1Id?: number | null;
  jurusan2Id?: number | null;
  jurusan3Id?: number | null;
  jurusan1?: Pick<Jurusan, 'id' | 'namaJurusan' | 'jenjangPendidikan'> | null;
  dataPmbTerkunci?: boolean;
  skemaPembiayaan: SkemaPembiayaan;
  formulirPendaftaran: boolean;
  lulusTesMasuk: boolean;
  akunBeasiswa: boolean | null;
  kelengkapanPersyaratan: boolean;
  /** Turunan (hanya baris tertaut peserta): semua Dokumen Pendaftaran / Dokumen Pendaftaran 2 sudah diupload. */
  dokumenUmumLengkap?: boolean;
  dokumenBeasiswaLengkap?: boolean;
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
  | 'LAINNYA'
  | 'MENUNGGU_UKOM';

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

/** Tahun Ajaran PMB / Keuangan (Modul Admin › Master) — periode tersendiri per modul, terpisah dari tahun akademik. */
export interface TahunModul {
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

export interface TahunAkademikOption {
  id: number;
  nama: string;
  jenisSemester: 'GANJIL' | 'GENAP';
  isActive: boolean;
  label: string;
}

export interface ProdiOption {
  kodeProdi: string;
  nama: string;
  jurusanIds: number[];
}

/** Konteks sesi staff yang dipilih saat login: tahun akademik acuan & prodi (modul Prodi). */
export interface AcademicContext {
  tahunAkademik: TahunAkademikOption | null;
  prodi: ProdiOption | null;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  context: AcademicContext;
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
  nuptk: string | null;
  namaLengkap: string;
  gelar: string | null;
  jurusanId: number | null;
  jurusan?: Jurusan | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: 'L' | 'P' | null;
  pendidikanAkhir: string | null;
  agama: string | null;
  telpHp: string | null;
  /** Foto profil (data URL base64), hanya dimuat di profil dosen login. */
  photo?: string | null;
  noWhatsapp?: string | null;
  jabatanFungsional?: string | null;
  kum?: number | null;
  email: string | null;
  alamat: string | null;
  statusDosen: 'TETAP' | 'TIDAK_TETAP' | null;
  /** Internal = dosen homebase Poltek; Eksternal = dosen luar/LB (termasuk staf struktural yang mengajar). */
  jenisDosen: 'INTERNAL' | 'EKSTERNAL';
  keterangan: string | null;
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

export interface DosenProdiStatItem {
  namaJurusan: string | null;
  total: number;
}

export type HariKuliah = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU';

/** Dosen pengampu jadwal + data tabel penghubung (SKS yang diberikan ke dosen tsb). */
export type DosenPengampu = Dosen & { JadwalKuliahDosenPengampu?: { sks: number | null } };

export interface JadwalKuliah {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  /** Jumlah mahasiswa yang mengambil kelas ini di KRS (hanya bila diminta: withJumlahMahasiswa=true). */
  jumlahMahasiswa?: number;
  namaMataKuliah: string;
  sks: number | null;
  sksTeori: number;
  sksPraktik: number;
  sksLab: number;
  dosenKordinatorId: number;
  dosenKordinator?: Dosen;
  dosenPengampu?: DosenPengampu[];
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
  // Diisi oleh endpoint jadwal-tersedia portal mahasiswa: nilai sebelumnya untuk mata kuliah ini
  // atau mata kuliah setaranya di kurikulum lain (Master Konversi Kurikulum).
  mengulang?: JadwalMengulangInfo | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JadwalMengulangInfo {
  kodeMataKuliah: string;
  namaMataKuliah: string;
  grade: string;
  semester: number;
  bedaKurikulum: boolean;
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
  /** Uraian materi (Pokok Bahasan). */
  uraian?: string | null;
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
  angkatan: number;
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
  | 'UJIAN_UAS'
  | 'DAFTAR_SIDANG_TA'
  | 'REKAP_NILAI_SIDANG'
  | 'JURNAL_KONSULTASI_TA';

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
    hp: string | null;
  };
  /** Hanya terisi untuk DAFTAR_SIDANG_TA & REKAP_NILAI_SIDANG: [pembimbing 1, pembimbing 2]. */
  pembimbing: (string | null)[];
  /** Data Pendaftar/Jadwal Sidang terakhir; null untuk jenis surat lain. */
  sidang: { judul: string | null; tahunAjaran: string | null; penguji: (string | null)[] } | null;
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

/** Mata kuliah milik satu kurikulum (Kurikulum 1 ──< N MataKuliah). */
export interface MataKuliah {
  id: number;
  kurikulumId: number;
  kode: string;
  mataKuliah: string;
  mataKuliahEn?: string | null;
  kelompokMataKuliah?: KelompokMataKuliah | null;
  kelompokKurikulum?: KelompokKurikulum | null;
  jenisMataKuliah?: JenisMataKuliah | null;
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksSimulasi: number;
  sksTotal: number;
  kelompokKompetensi?: KelompokKompetensi | null;
  kompIlmuKomputer?: string | null;
  mataKuliahMinat?: string | null;
  muatanMataKuliah?: string | null;
  metodePembelajaran?: string | null;
  idMatkul?: string | null;
  semester: number | null;
  /** Mata kuliah berbasis OBE (Outcome-Based Education). */
  isObe: boolean;
  /** Target capaian MK OBE (0–100). */
  targetCpl?: number | null;
  targetCpmk?: number | null;
  silabus?: string | null;
  /** Kunci tema ikon ilustrasi E-learning; null = otomatis dari nama. */
  ikon?: string | null;
  /** Alias kompatibel (= kode / mataKuliah / sksTotal). */
  kodeMk: string;
  namaMk: string;
  sks: number;
  kurikulum?: Kurikulum | null;
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
  hari?: string[] | null;
  jam?: number | null;
  semester?: number | null;
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
  /** Uraian materi/pokok bahasan pertemuan. */
  uraian: string | null;
  /** Dosen yang mencatat/mengajar pertemuan ini. */
  dosen?: { id: number; namaLengkap: string; gelar: string | null } | null;
  /** Jumlah mahasiswa berstatus HADIR pada pertemuan ini. */
  jumlahHadir?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Kepala halaman Realisasi Mengajar untuk satu kelas. */
export interface RingkasanKelasDosen {
  jadwalKuliahId: number;
  programStudi: string | null;
  periode: string | null;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  kelas: string;
  semester: number | null;
  rencanaTatapMuka: number;
  jumlahPertemuan: number;
  jumlahMahasiswa: number;
  tanggalMulaiEfektif: string | null;
  tanggalAkhirEfektif: string | null;
  metodePembelajaran: string | null;
  ruangan: string | null;
  dosenKordinator: string | null;
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
  /** Status kelas (Golongan Kelas): Reguler / Karyawan. */
  sistemKuliah: string | null;
  status: StatusKehadiranMahasiswa | null;
  keterangan: string | null;
}

export interface SavePresensiMahasiswaItem {
  mahasiswaId: number;
  status: StatusKehadiranMahasiswa;
  keterangan?: string | null;
}

export type PeranSidang = 'PEMBIMBING_1' | 'PEMBIMBING_2' | 'PENGUJI_1' | 'PENGUJI_2';

export interface KoreksiSidangItem {
  id: number;
  pendaftarSidangId: number;
  peran: PeranSidang;
  babHalaman: string | null;
  uraian: string;
  isSelesai: boolean;
}

/** Satu baris di halaman Nilai Sidang portal dosen: satu pendaftar sidang x satu peran dosen. */
export interface NilaiSidangRow {
  pendaftarSidangId: number;
  peran: PeranSidang;
  judul: string;
  mahasiswa: { id: number; nim: string; namaLengkap: string };
  jadwalSidang: { tanggal: string; jam: string; ruangan: string | null } | null;
  nilai: number | null;
  grade: string | null;
}

export interface SilabusMatakuliahRow {
  kodeMk: string;
  namaMk: string;
  sks: number | null;
  silabus: string | null;
}

/** BELUM_ISI hanya dari filter "Belum Isi KRS" (baris mahasiswa tanpa KRS, tidak tersimpan). */
export type StatusKrs = 'DRAFT' | 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK' | 'BELUM_ISI';

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
  /** null = masih terkunci karena angket dosen kelas ini belum diisi (perluIsiAngket). */
  nilai: number | null;
  grade: string | null;
  bobot: number;
  mutu: number;
  // false = mata kuliah ini sudah diulang (termasuk lewat konversi kurikulum); tidak dihitung di IPK.
  diakui?: boolean;
  /** Nilai disembunyikan sampai angket dosen kelas ini diisi (Akademik → Angket Dosen). */
  perluIsiAngket?: boolean;
  jadwalKuliahId?: number | null;
}

export interface KhsSemester {
  semester: number;
  nilai: NilaiKhsEntry[];
  totalSks: number;
  totalMutu: number;
  ipSemester: number;
  /** Ada nilai yang terkunci angket dosen; cetak KHS semester ini ditolak. */
  terkunciEdom?: boolean;
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
    tahunAjaran?: { id: number; nama: string; jenisSemester?: SemesterGanjilGenap } | null;
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

export type StatusCicilan = 'LUNAS' | 'SEBAGIAN' | 'BELUM_BAYAR';

/** Cicilan bulanan tagihan kuliah; status dihitung dari total dibayar (dialokasikan ke cicilan paling awal). */
export interface TagihanCicilan {
  id?: number;
  cicilanKe: number;
  /** Bulan tagihan (YYYY-MM-01). */
  periode: string;
  nominal: number;
  tanggalJatuhTempo: string | null;
  noVirtualAccount: string | null;
  keterangan?: string | null;
  dibayar: number;
  sisa: number;
  status: StatusCicilan;
  terlambat: boolean;
}

export interface CicilanRingkas {
  jumlah: number;
  lunas: number;
  berikutnya: {
    cicilanKe: number;
    periode: string;
    sisa: number;
    tanggalJatuhTempo: string | null;
    noVirtualAccount: string | null;
    terlambat: boolean;
  } | null;
}

export interface TagihanKuliah {
  /** Tagihan dari file keuangan sebelum potongan (totalTagihan = tagihanAwal - potongan). */
  tagihanAwal?: number | string | null;
  id: number;
  mahasiswaId: number;
  mahasiswa?: Mahasiswa;
  tahunAjaranId: number;
  tahunAjaran?: TahunAjaran;
  semester: number;
  /** Total SKS di KRS mahasiswa pada tahun akademik tagihan (null = belum ada KRS). */
  totalSks?: number | null;
  /** Ringkasan cicilan bulanan (null = dibayar sekaligus, tanpa cicilan). */
  cicilan?: CicilanRingkas | null;
  sksDiambil: number;
  hargaPerSks: number;
  biayaSks: number;
  biayaBpp: number;
  biayaSpp: number;
  potongan: number;
  totalTagihan: number;
  /** Hasil import keuangan: total bayar per tanggal import & tunggakan semester sebelumnya (terpisah). */
  totalBayarImport: number;
  tunggakan: number;
  tanggalJatuhTempo: string | null;
  noVirtualAccount: string | null;
  keterangan: string | null;
  sumber: 'GENERATE' | 'IMPORT';
  importedAt: string | null;
  totalDibayar: number;
  sisaTagihan: number;
  totalKewajiban: number;
  statusTagihan: StatusTagihan;
  pembayaranList?: PembayaranKuliah[];
  createdAt?: string;
  updatedAt?: string;
}

export type StatusTagihan = 'LUNAS' | 'SEBAGIAN' | 'BELUM_BAYAR';

export type AksiImportTagihan = 'BARU' | 'UBAH' | 'TETAP' | 'GAGAL';

export interface ImportTagihanRow {
  rowNumber: number;
  nim: string;
  namaLengkap: string | null;
  periode: string;
  totalTagihan: number | null;
  totalBayar: number | null;
  tunggakan: number | null;
  sisaBayar: number | null;
  tanggalJatuhTempo: string | null;
  noVirtualAccount: string | null;
  keterangan: string | null;
  aksi: AksiImportTagihan;
  error?: string;
  perubahan?: { field: string; lama: string | number | null; baru: string | number | null }[];
}

/** VA bank per mahasiswa per periode (hasil Import VA; VA berganti tiap bulan). */
export interface VirtualAccountMahasiswa {
  id: number;
  mahasiswaId: number;
  noVirtualAccount: string;
  periodeOpen: string;
  periodeClose: string;
  nominal: number;
}

export interface ImportVaRow {
  rowNumber: number;
  nim: string;
  namaLengkap: string | null;
  noVirtualAccount: string | null;
  periodeOpen: string | null;
  periodeClose: string | null;
  nominal: number | null;
  aksi: AksiImportTagihan;
  error?: string;
}

export interface ImportTagihanSummary {
  totalRows: number;
  baru: number;
  ubah: number;
  tetap: number;
  gagal: number;
}

export interface ImportTagihanBatch {
  id: number;
  fileName: string | null;
  status: 'BERHASIL' | 'SEBAGIAN' | 'GAGAL';
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  failedRows: number;
  errors: { row: number; nim: string; message: string }[] | null;
  importedAt: string;
  importer?: { id: number; name: string } | null;
  logs?: {
    id: number;
    rowNumber: number | null;
    nim: string | null;
    aksi: AksiImportTagihan;
    nilaiLama: Record<string, string | number | null> | null;
    nilaiBaru: Record<string, string | number | null> | null;
    pesan: string | null;
    mahasiswa?: { id: number; nim: string; namaLengkap: string } | null;
  }[];
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
  tahunAjaranId: number | null;
  tahunAjaran?: Pick<TahunAjaran, 'id' | 'nama' | 'jenisSemester'> | null;
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
  /** Keringanan dihitung untuk syarat KRS / UTS / UAS (UAS = syarat akhir semester: UAS, nilai, KHS). */
  berlakuKrs: boolean;
  berlakuUts: boolean;
  berlakuUas: boolean;
  /** Lewat tanggal ini keringanan tidak dihitung lagi; null = tanpa batas. */
  sampaiTanggal: string | null;
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
  tahunAjaran?: Pick<TahunAjaran, 'id' | 'nama' | 'jenisSemester'>;
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

/** Kurikulum (header) satu prodi pada satu tahun kurikulum; memiliki banyak mata kuliah. */
export interface Kurikulum {
  id: number;
  jurusanId: number | null;
  tahunKurikulum: number | null;
  nama: string;
  tanggalMulaiEfektif: string | null;
  tanggalAkhirEfektif: string | null;
  keterangan?: string | null;
  isActive: boolean;
  jurusan?: Pick<Jurusan, 'id' | 'namaJurusan' | 'kodeProdi'> | null;
  /** Ringkasan (list/detail): jumlah mata kuliah (total / OBE / Non OBE) & total SKS. */
  jumlahMataKuliah?: number;
  jumlahObe?: number;
  jumlahNonObe?: number;
  totalSks?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Pilihan kurikulum untuk dropdown. */
export interface KurikulumOption {
  value: number;
  label: string;
  jurusanId: number | null;
  prodi: string | null;
  tahunKurikulum: number | null;
  isActive?: boolean;
}

export interface KonversiKurikulumRow {
  dariMataKuliah: MataKuliah;
  keMataKuliahId: number | null;
  keMataKuliah: MataKuliah | null;
}

export interface KonversiKurikulumList {
  rows: KonversiKurikulumRow[];
  keOptions: MataKuliah[];
}

export interface BiodataMahasiswaItem {
  id: number;
  nim: string;
  namaLengkap: string;
  statusMasuk: StatusMasukMahasiswa;
  biodata: MahasiswaBiodata | null;
  jurusan: { id: number; namaJurusan: string; kodeProdi: string | null } | null;
}
