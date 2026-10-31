import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { MENU } from '@/constants/menuCodes';
import { FEEDER_ENTITIES } from '@/constants/feederEntities';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    menuCode?: string;
    pesertaAuth?: boolean;
    dosenAuth?: boolean;
    mahasiswaAuth?: boolean;
    /** Key entitas untuk halaman generik Feeder PDDIKTI (modul SIM). */
    feederEntity?: string;
    /** Judul halaman untuk view placeholder yang dipakai beberapa route. */
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  // ---- Public PMB website ----
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/public/HomeView.vue'),
    meta: { public: true },
  },
  {
    path: '/pendaftaran',
    name: 'pendaftaran-daftar',
    component: () => import('@/views/public/RegisterView.vue'),
    meta: { public: true },
  },
  {
    path: '/pendaftaran/masuk',
    name: 'pendaftaran-masuk',
    component: () => import('@/views/public/PesertaLoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/pendaftaran/lupa-password',
    name: 'pendaftaran-lupa-password',
    component: () => import('@/views/public/PesertaForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/pendaftaran/reset-password',
    name: 'pendaftaran-reset-password',
    component: () => import('@/views/public/PesertaResetPasswordView.vue'),
    meta: { public: true },
  },
  {
    // Wajib dibuka saat akun peserta masih memakai password awal (nomor HP).
    path: '/pendaftaran/ganti-password',
    name: 'pendaftaran-ganti-password',
    component: () => import('@/views/public/PesertaGantiPasswordView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/pendaftaran/biodata',
    name: 'pendaftaran-biodata',
    component: () => import('@/views/public/BiodataView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/pendaftaran/dokumen',
    name: 'pendaftaran-dokumen',
    component: () => import('@/views/public/UploadDokumenView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/pendaftaran/dokumen-beasiswa',
    name: 'pendaftaran-dokumen-beasiswa',
    component: () => import('@/views/public/UploadDokumenView.vue'),
    meta: { pesertaAuth: true, dokumenBeasiswa: true },
  },
  {
    path: '/pendaftaran/tes-ujian',
    name: 'pendaftaran-tes-ujian',
    component: () => import('@/views/public/TesUjianView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/pendaftaran/tes-ujian/:id/kerjakan',
    name: 'pendaftaran-tes-ujian-kerjakan',
    component: () => import('@/views/public/KerjakanUjianView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/pendaftaran/data-pendaftaran',
    name: 'pendaftaran-data-pendaftaran',
    component: () => import('@/views/public/DataPendaftaranView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/pendaftaran/status',
    name: 'pendaftaran-status',
    component: () => import('@/views/public/StatusPendaftaranView.vue'),
    meta: { pesertaAuth: true },
  },
  {
    path: '/beasiswa/:slug',
    name: 'beasiswa-detail',
    component: () => import('@/views/public/BeasiswaDetailView.vue'),
    meta: { public: true },
    props: true,
  },
  {
    path: '/biaya-kuliah/:slug',
    name: 'biaya-kuliah-detail',
    component: () => import('@/views/public/BiayaKuliahDetailView.vue'),
    meta: { public: true },
    props: true,
  },
  {
    path: '/informasi/calon-mahasiswa',
    name: 'informasi-calon-mahasiswa',
    component: () => import('@/views/public/InformasiCalonMahasiswaView.vue'),
    meta: { public: true },
  },

  // ---- Portal Dosen (self-service, auth & nav terpisah dari sistem admin) ----
  {
    path: '/dosen/login',
    name: 'dosen-login',
    component: () => import('@/views/dosen/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/dosen',
    component: () => import('@/components/layout/DosenLayout.vue'),
    children: [
      { path: '', redirect: '/dosen/dashboard' },
      {
        path: 'dashboard',
        name: 'dosen-dashboard',
        component: () => import('@/views/dosen/DashboardView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'kehadiran-mengajar',
        name: 'dosen-kehadiran-mengajar',
        component: () => import('@/views/dosen/KehadiranMengajarView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'e-learning',
        name: 'dosen-elearning',
        component: () => import('@/views/dosen/ElearningView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'e-learning/my-class',
        name: 'dosen-elearning-myclass',
        component: () => import('@/views/dosen/ElearningMyClassView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'e-learning/timeline',
        name: 'dosen-elearning-timeline',
        component: () => import('@/views/dosen/ElearningTimelineView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'e-learning/obrolan',
        name: 'dosen-elearning-obrolan',
        component: () => import('@/views/ElearningObrolanView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'e-learning/jelajah',
        name: 'dosen-elearning-jelajah',
        component: () => import('@/views/ElearningJelajahView.vue'),
        meta: { dosenAuth: true },
      },
      {
        // Laporan tugas per kelas + unduh Excel — sebelum 'e-learning/:id'.
        path: 'e-learning/laporan-tugas',
        name: 'dosen-elearning-laporan-tugas',
        component: () => import('@/views/dosen/ElearningLaporanTugasView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'e-learning/:id',
        name: 'dosen-elearning-kelas',
        component: () => import('@/views/dosen/ElearningKelasView.vue'),
        props: true,
        meta: { dosenAuth: true },
      },
      // Menu "Mata Kuliah" dosen digabung ke Input Nilai (daftar mata kuliah + input nilai per kelas).
      { path: 'mata-kuliah', name: 'dosen-mata-kuliah', redirect: { name: 'dosen-periodik' } },
      {
        // Halaman RPS yang sama dengan Prodi; klien API & hak ubah versi dosen (meta.portal).
        path: 'mata-kuliah/:id/rps',
        name: 'dosen-mata-kuliah-rps',
        component: () => import('@/views/prodi/kurikulum/RpsMataKuliahView.vue'),
        props: true,
        meta: { dosenAuth: true, portal: 'dosen', backRoute: 'dosen-periodik', breadcrumb: 'Dosen / Perkuliahan / Input Nilai' },
      },
      {
        path: 'kelas-kuliah',
        name: 'dosen-kelas-kuliah',
        component: () => import('@/views/dosen/KelasKuliahView.vue'),
        meta: { dosenAuth: true },
      },
      {
        // Halaman detail kelas yang sama dengan Prodi; klien API versi dosen (meta.portal).
        path: 'kelas-kuliah/:id',
        name: 'dosen-kelas-kuliah-detail',
        component: () => import('@/views/prodi/perkuliahan/KelasKuliahDetailView.vue'),
        props: true,
        meta: { dosenAuth: true, portal: 'dosen', backRoute: 'dosen-kelas-kuliah' },
      },
      {
        path: 'pengumuman',
        name: 'dosen-pengumuman',
        component: () => import('@/views/dosen/PengumumanView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'laporan-elearning',
        name: 'dosen-laporan-elearning',
        component: () => import('@/views/dosen/LaporanElearningView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'rekap',
        name: 'dosen-rekap',
        component: () => import('@/views/dosen/RekapView.vue'),
        meta: { dosenAuth: true },
      },
      // URL lama (sebelum digabung) diarahkan ke tab yang sesuai.
      { path: 'rekap-mahasiswa', name: 'dosen-rekap-mahasiswa', redirect: { name: 'dosen-rekap', query: { tab: 'mahasiswa' } } },
      { path: 'rekap-realisasi', name: 'dosen-rekap-realisasi', redirect: { name: 'dosen-rekap', query: { tab: 'realisasi' } } },
      {
        path: 'jadwal-ujian',
        name: 'dosen-jadwal-ujian',
        component: () => import('@/views/dosen/JadwalUjianView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'periodik',
        name: 'dosen-periodik',
        component: () => import('@/views/dosen/PeriodikView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'lain-lain',
        name: 'dosen-lain-lain',
        component: () => import('@/views/dosen/LainLainView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'referensi-judul',
        name: 'dosen-referensi-judul',
        component: () => import('@/views/dosen/ReferensiJudulView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'mahasiswa-pa',
        name: 'dosen-mahasiswa-pa',
        component: () => import('@/views/dosen/MahasiswaPaView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'kesediaan-mengajar',
        name: 'dosen-kesediaan-mengajar',
        component: () => import('@/views/dosen/KesediaanMengajarView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'panduan-sistem',
        name: 'dosen-panduan-sistem',
        component: () => import('@/views/dosen/PanduanSistemView.vue'),
        meta: { dosenAuth: true },
      },
      {
        // Persetujuan KRS oleh dosen pembimbing akademik.
        path: 'krs-bimbingan',
        name: 'dosen-krs-bimbingan',
        component: () => import('@/views/dosen/KrsBimbinganView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'silabus-matakuliah',
        name: 'dosen-silabus-matakuliah',
        component: () => import('@/views/dosen/SilabusMatakuliahView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'bimbingan-ta',
        name: 'dosen-bimbingan-ta',
        component: () => import('@/views/dosen/BimbinganTaView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'nilai-sidang',
        name: 'dosen-nilai-sidang',
        component: () => import('@/views/dosen/NilaiSidangView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'lembar-koreksi',
        name: 'dosen-lembar-koreksi',
        component: () => import('@/views/dosen/LembarKoreksiView.vue'),
        meta: { dosenAuth: true },
      },
    ],
  },

  // ---- Portal Mahasiswa (self-service, auth & nav terpisah dari sistem admin) ----
  {
    path: '/mahasiswa/login',
    name: 'mahasiswa-login',
    component: () => import('@/views/mahasiswa/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/mahasiswa',
    component: () => import('@/components/layout/MahasiswaLayout.vue'),
    children: [
      { path: '', redirect: '/mahasiswa/dashboard' },
      {
        path: 'dashboard',
        name: 'mahasiswa-dashboard',
        component: () => import('@/views/mahasiswa/DashboardView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'biodata',
        name: 'mahasiswa-biodata',
        component: () => import('@/views/mahasiswa/BiodataView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'krs',
        name: 'mahasiswa-krs',
        component: () => import('@/views/mahasiswa/KrsView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'jadwal',
        name: 'mahasiswa-jadwal',
        component: () => import('@/views/mahasiswa/JadwalView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'nilai',
        name: 'mahasiswa-nilai',
        component: () => import('@/views/mahasiswa/NilaiView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'transkrip',
        name: 'mahasiswa-transkrip',
        component: () => import('@/views/mahasiswa/TranskripView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'pembayaran',
        name: 'mahasiswa-pembayaran',
        component: () => import('@/views/mahasiswa/PembayaranView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'surat-keterangan',
        name: 'mahasiswa-surat-keterangan',
        component: () => import('@/views/mahasiswa/SuratKeteranganView.vue'),
        meta: { mahasiswaAuth: true },
      },
      // Pengajuan (dropdown di nav): Cetak Surat (route surat-keterangan di atas) + pengajuan lain
      // yang alurnya belum dibuat — sementara menampilkan halaman "segera tersedia".
      {
        path: 'pengajuan/cuti',
        name: 'mahasiswa-pengajuan-cuti',
        component: () => import('@/views/mahasiswa/PengajuanCutiView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'pengajuan/judul-skripsi',
        name: 'mahasiswa-pengajuan-judul',
        component: () => import('@/views/mahasiswa/TugasAkhirView.vue'),
        meta: { mahasiswaAuth: true, title: 'Pendaftaran Judul Skripsi/TA' },
      },
      {
        path: 'pengajuan/kkp',
        name: 'mahasiswa-pengajuan-kkp',
        component: () => import('@/views/mahasiswa/PengajuanKkpView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'pengajuan/sidang',
        name: 'mahasiswa-pengajuan-sidang',
        component: () => import('@/views/mahasiswa/SidangView.vue'),
        meta: { mahasiswaAuth: true, title: 'Pengajuan Sidang' },
      },
      {
        path: 'panduan',
        name: 'mahasiswa-panduan',
        component: () => import('@/views/mahasiswa/PanduanView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'ktm',
        name: 'mahasiswa-ktm',
        component: () => import('@/views/mahasiswa/KtmView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'pengumuman',
        name: 'mahasiswa-pengumuman',
        component: () => import('@/views/mahasiswa/PengumumanView.vue'),
        meta: { mahasiswaAuth: true },
      },
      // Data Kampus (dropdown di nav): kurikulum, kehadiran, hasil studi.
      {
        path: 'kurikulum',
        name: 'mahasiswa-kurikulum',
        component: () => import('@/views/mahasiswa/KurikulumView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'kalender-akademik',
        name: 'mahasiswa-kalender-akademik',
        component: () => import('@/views/mahasiswa/KalenderAkademikView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'angket-dosen',
        name: 'mahasiswa-angket-dosen',
        component: () => import('@/views/mahasiswa/AngketDosenView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'kehadiran',
        name: 'mahasiswa-kehadiran',
        component: () => import('@/views/mahasiswa/KehadiranView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'bimbingan',
        name: 'mahasiswa-bimbingan',
        component: () => import('@/views/mahasiswa/BimbinganView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'informasi-dosen',
        name: 'mahasiswa-informasi-dosen',
        component: () => import('@/views/mahasiswa/InformasiDosenView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        // E-learning mahasiswa: tampilan sama dengan dosen (menu samping), tanpa panel "Bagikan".
        path: 'e-learning',
        name: 'mahasiswa-elearning',
        component: () => import('@/views/mahasiswa/ElearningBerandaView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'e-learning/my-class',
        name: 'mahasiswa-elearning-myclass',
        component: () => import('@/views/mahasiswa/ElearningMyClassView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        // My Team: tugas & konten grup (target GRUP) yang memuat mahasiswa.
        path: 'e-learning/my-team',
        name: 'mahasiswa-elearning-myteam',
        component: () => import('@/views/mahasiswa/ElearningMyTeamView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'e-learning/timeline',
        name: 'mahasiswa-elearning-timeline',
        component: () => import('@/views/mahasiswa/ElearningBerandaView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'e-learning/learning-history',
        name: 'mahasiswa-elearning-history',
        component: () => import('@/views/mahasiswa/ElearningHistoryView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'e-learning/obrolan',
        name: 'mahasiswa-elearning-obrolan',
        component: () => import('@/views/ElearningObrolanView.vue'),
        meta: { mahasiswaAuth: true, portal: 'mahasiswa' },
      },
      {
        path: 'e-learning/jelajah',
        name: 'mahasiswa-elearning-jelajah',
        component: () => import('@/views/ElearningJelajahView.vue'),
        meta: { mahasiswaAuth: true, portal: 'mahasiswa' },
      },
      {
        // Konten satu kelas (tanpa :id = semua kelas); ?konten=<id> langsung membuka konten.
        path: 'e-learning/kelas/:id?',
        name: 'mahasiswa-elearning-kelas',
        component: () => import('@/views/mahasiswa/ElearningView.vue'),
        meta: { mahasiswaAuth: true },
      },
      {
        path: 'tiket',
        name: 'mahasiswa-tiket',
        component: () => import('@/views/mahasiswa/TiketView.vue'),
        meta: { mahasiswaAuth: true },
      },
    ],
  },

  // ---- Admin console ----
  {
    path: '/admin/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/admin/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/admin/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/admin',
    component: () => import('@/components/layout/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/admin/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { menuCode: MENU.DASHBOARD },
      },
      {
        path: 'golongan-kelas',
        name: 'golongan-kelas',
        component: () => import('@/views/master/GolonganKelasView.vue'),
        meta: { menuCode: MENU.GOLONGAN_KELAS_MANAGEMENT },
      },
      {
        path: 'jurusan',
        name: 'jurusan',
        component: () => import('@/views/master/JurusanView.vue'),
        meta: { menuCode: MENU.JURUSAN_MANAGEMENT },
      },
      {
        path: 'sumber-informasi',
        name: 'sumber-informasi',
        component: () => import('@/views/master/SumberInformasiView.vue'),
        meta: { menuCode: MENU.SUMBER_INFORMASI_MANAGEMENT },
      },
      {
        path: 'ukuran-almamater',
        name: 'ukuran-almamater',
        component: () => import('@/views/master/UkuranAlmamaterView.vue'),
        meta: { menuCode: MENU.UKURAN_ALMAMATER_MANAGEMENT },
      },
      {
        path: 'pembayaran',
        name: 'pembayaran',
        component: () => import('@/views/master/PembayaranView.vue'),
        meta: { menuCode: MENU.PEMBAYARAN_MANAGEMENT },
      },
      {
        path: 'dokumen-pendaftaran',
        name: 'dokumen-pendaftaran',
        component: () => import('@/views/master/DokumenPendaftaranView.vue'),
        meta: { menuCode: MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT },
      },
      {
        path: 'dokumen-kelengkapan',
        name: 'dokumen-kelengkapan',
        component: () => import('@/views/master/DokumenKelengkapanView.vue'),
        meta: { menuCode: MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT },
      },
      {
        path: 'gelombang',
        name: 'gelombang',
        component: () => import('@/views/master/GelombangView.vue'),
        meta: { menuCode: MENU.GELOMBANG_MANAGEMENT },
      },
      {
        path: 'tes-ujian',
        name: 'tes-ujian',
        component: () => import('@/views/master/TesUjianView.vue'),
        meta: { menuCode: MENU.TES_UJIAN_MANAGEMENT },
      },
      {
        path: 'kampus',
        name: 'kampus',
        component: () => import('@/views/master/KampusView.vue'),
        meta: { menuCode: MENU.KAMPUS_MANAGEMENT },
      },
      {
        path: 'home-images',
        name: 'home-images',
        component: () => import('@/views/master/HomeImagesView.vue'),
        meta: { menuCode: MENU.HOME_IMAGE_MANAGEMENT },
      },
      {
        path: 'beasiswa',
        name: 'beasiswa',
        component: () => import('@/views/master/BeasiswaView.vue'),
        meta: { menuCode: MENU.BEASISWA_MANAGEMENT },
      },
      {
        path: 'biaya-kuliah',
        name: 'biaya-kuliah',
        component: () => import('@/views/master/BiayaKuliahView.vue'),
        meta: { menuCode: MENU.BIAYA_KULIAH_MANAGEMENT },
      },
      {
        path: 'calon-mahasiswa',
        name: 'calon-mahasiswa',
        component: () => import('@/views/informasi/CalonMahasiswaView.vue'),
        meta: { menuCode: MENU.CALON_MAHASISWA_MANAGEMENT },
      },
      {
        path: 'reporting',
        name: 'reporting',
        component: () => import('@/views/reporting/ReportingView.vue'),
        meta: { menuCode: MENU.REPORTING_MANAGEMENT },
      },
      // ---- Master grafik PMB ----
      {
        path: 'grafik/banding',
        name: 'grafik-banding',
        component: () => import('@/views/grafik/GrafikBandingView.vue'),
        meta: { menuCode: MENU.PMB_GRAFIK_BANDING_MANAGEMENT },
      },
      {
        path: 'grafik/tahunan',
        name: 'grafik-tahunan',
        component: () => import('@/views/grafik/GrafikTahunanView.vue'),
        meta: { menuCode: MENU.PMB_GRAFIK_TAHUNAN_MANAGEMENT, title: 'Grafik Tahunan' },
      },
      {
        path: 'grafik/penerimaan',
        name: 'grafik-penerimaan',
        component: () => import('@/views/grafik/GrafikPenerimaanView.vue'),
        meta: { menuCode: MENU.PMB_GRAFIK_PENERIMAAN_MANAGEMENT, title: 'Grafik Penerimaan' },
      },
      {
        path: 'grafik/daftar-ulang',
        name: 'grafik-daftar-ulang',
        component: () => import('@/views/grafik/GrafikDaftarUlangView.vue'),
        meta: { menuCode: MENU.PMB_GRAFIK_DAFTAR_ULANG_MANAGEMENT, title: 'Grafik Daftar Ulang' },
      },
      {
        path: 'menus',
        name: 'menus',
        component: () => import('@/views/system/MenusView.vue'),
        meta: { menuCode: MENU.MENU_MANAGEMENT },
      },
      {
        path: 'audit-log',
        name: 'audit-log',
        component: () => import('@/views/system/AuditLogView.vue'),
        meta: { menuCode: MENU.AUDIT_LOG_MANAGEMENT },
      },
      {
        path: 'readme',
        name: 'readme',
        component: () => import('@/views/system/ReadMeView.vue'),
        meta: { menuCode: MENU.README_MANAGEMENT },
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },

  // ---- BAAK console ----
  {
    path: '/baak',
    component: () => import('@/components/layout/BaakLayout.vue'),
    children: [
      { path: '', redirect: '/baak/dashboard' },
      {
        path: 'dashboard',
        name: 'baak-dashboard',
        component: () => import('@/views/baak/DashboardView.vue'),
        meta: { menuCode: MENU.BAAK_DASHBOARD },
      },
      {
        path: 'mahasiswa',
        name: 'baak-mahasiswa',
        component: () => import('@/views/baak/MahasiswaView.vue'),
        meta: { menuCode: MENU.MAHASISWA_MANAGEMENT },
      },
      {
        path: 'generate-nim',
        name: 'baak-generate-nim',
        component: () => import('@/views/baak/GenerateNimView.vue'),
        meta: { menuCode: MENU.BAAK_GENERATE_NIM_MANAGEMENT, title: 'Generate NIM' },
      },
      {
        // Halaman yang sama dengan Prodi > Masa Studi, dengan hak akses menu BAAK sendiri.
        path: 'masa-studi',
        name: 'baak-masa-studi',
        component: () => import('@/views/prodi/mahasiswa/HabisMasaStudiView.vue'),
        meta: { menuCode: MENU.BAAK_MASA_STUDI_MANAGEMENT, title: 'Masa Studi' },
      },
      {
        path: 'jadwal-kuliah',
        name: 'baak-jadwal-kuliah',
        component: () => import('@/views/baak/JadwalKuliahView.vue'),
        meta: { menuCode: MENU.JADWAL_KULIAH_MANAGEMENT },
      },
      {
        path: 'mata-kuliah',
        name: 'baak-mata-kuliah',
        component: () => import('@/views/baak/MataKuliahView.vue'),
        meta: { menuCode: MENU.MATA_KULIAH_MANAGEMENT },
      },
      {
        path: 'krs',
        name: 'baak-krs',
        component: () => import('@/views/baak/KrsView.vue'),
        meta: { menuCode: MENU.KRS_MANAGEMENT },
      },
      {
        path: 'kehadiran-dosen',
        name: 'baak-kehadiran-dosen',
        component: () => import('@/views/baak/KehadiranDosenView.vue'),
        meta: { menuCode: MENU.KEHADIRAN_DOSEN_MANAGEMENT },
      },
      {
        path: 'monitoring',
        name: 'baak-monitoring',
        component: () => import('@/views/baak/MonitoringView.vue'),
        meta: { menuCode: MENU.MASTER_MONITORING_MANAGEMENT },
      },
      {
        path: 'monitoring/:id',
        name: 'baak-monitoring-detail',
        component: () => import('@/views/baak/MonitoringDetailView.vue'),
        meta: { menuCode: MENU.MASTER_MONITORING_MANAGEMENT },
        props: true,
      },
      {
        path: 'audit-log',
        name: 'baak-audit-log',
        component: () => import('@/views/system/AuditLogView.vue'),
        meta: { menuCode: MENU.BAAK_AUDIT_LOG_MANAGEMENT },
      },
      {
        path: 'monitoring-nilai',
        name: 'baak-monitoring-nilai',
        component: () => import('@/views/baak/NilaiMonitoringView.vue'),
        meta: { menuCode: MENU.NILAI_MONITORING_MANAGEMENT },
      },
      {
        path: 'monitoring-nilai/:mahasiswaId',
        name: 'baak-monitoring-nilai-detail',
        component: () => import('@/views/baak/NilaiMonitoringDetailView.vue'),
        meta: { menuCode: MENU.NILAI_MONITORING_MANAGEMENT },
        props: true,
      },
      {
        path: 'yudisium',
        name: 'baak-yudisium',
        component: () => import('@/views/baak/YudisiumView.vue'),
        meta: { menuCode: MENU.YUDISIUM_MANAGEMENT },
      },
      {
        path: 'laporan/ijazah-transkrip',
        name: 'baak-laporan-ijazah-transkrip',
        component: () => import('@/views/baak/laporan/IjazahTranskripView.vue'),
        meta: { menuCode: MENU.LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT },
      },
      {
        path: 'laporan/cetak-surat',
        name: 'baak-laporan-cetak-surat',
        component: () => import('@/views/baak/laporan/CetakSuratView.vue'),
        meta: { menuCode: MENU.LAPORAN_CETAK_SURAT_MANAGEMENT },
      },
      {
        path: 'laporan/cetak-realisasi',
        name: 'baak-laporan-cetak-realisasi',
        component: () => import('@/views/baak/laporan/CetakRealisasiView.vue'),
        meta: { menuCode: MENU.LAPORAN_CETAK_REALISASI_MANAGEMENT },
      },
      {
        path: 'laporan/cetak-mahasiswa-perkelas',
        name: 'baak-laporan-cetak-mahasiswa-perkelas',
        component: () => import('@/views/baak/laporan/CetakMahasiswaPerkelasView.vue'),
        meta: { menuCode: MENU.LAPORAN_CETAK_MAHASISWA_PERKELAS_MANAGEMENT },
      },
      {
        path: 'laporan/cetak-kehadiran-mengajar',
        name: 'baak-laporan-cetak-kehadiran-mengajar',
        component: () => import('@/views/baak/laporan/CetakKehadiranMengajarView.vue'),
        meta: { menuCode: MENU.LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT },
      },
      {
        path: 'laporan/cetak-khs',
        name: 'baak-laporan-cetak-khs',
        component: () => import('@/views/baak/laporan/CetakKhsView.vue'),
        meta: { menuCode: MENU.LAPORAN_CETAK_KHS_MANAGEMENT },
      },
      {
        path: 'pengumuman',
        name: 'baak-pengumuman',
        component: () => import('@/views/baak/PengumumanView.vue'),
        meta: { menuCode: MENU.BAAK_PENGUMUMAN_MANAGEMENT },
      },
      {
        path: 'kalender-akademik',
        name: 'baak-kalender-akademik',
        component: () => import('@/views/baak/KalenderAkademikView.vue'),
        meta: { menuCode: MENU.BAAK_KALENDER_AKADEMIK_MANAGEMENT },
      },
      {
        path: 'readme',
        name: 'baak-readme',
        component: () => import('@/views/baak/ReadMeView.vue'),
        meta: { menuCode: MENU.BAAK_README_MANAGEMENT },
      },
      {
        path: '403',
        name: 'baak-forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },

  // ---- SDI console ----
  {
    path: '/sdi',
    component: () => import('@/components/layout/SdiLayout.vue'),
    children: [
      { path: '', redirect: '/sdi/dashboard' },
      {
        path: 'dashboard',
        name: 'sdi-dashboard',
        component: () => import('@/views/sdi/DashboardView.vue'),
        meta: { menuCode: MENU.SDI_DASHBOARD },
      },
      {
        path: 'dosen',
        name: 'sdi-dosen',
        component: () => import('@/views/sdi/DosenView.vue'),
        meta: { menuCode: MENU.DOSEN_MANAGEMENT },
      },
      {
        path: 'karyawan',
        name: 'sdi-karyawan',
        component: () => import('@/views/sdi/KaryawanView.vue'),
        meta: { menuCode: MENU.KARYAWAN_MANAGEMENT },
      },
      {
        path: 'sync-finger-a1',
        name: 'sdi-sync-finger-a1',
        component: () => import('@/views/sdi/SyncFingerA1View.vue'),
        meta: { menuCode: MENU.SYNC_FINGER_A1_MANAGEMENT },
      },
      {
        path: 'sync-finger-a2',
        name: 'sdi-sync-finger-a2',
        component: () => import('@/views/sdi/SyncFingerA2View.vue'),
        meta: { menuCode: MENU.SYNC_FINGER_A2_MANAGEMENT },
      },
      {
        path: 'dinas-cuti-lupa-finger',
        name: 'sdi-dinas-cuti-lupa-finger',
        component: () => import('@/views/sdi/DinasCutiLupaFingerView.vue'),
        meta: { menuCode: MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT },
      },
      {
        path: 'report-finger',
        name: 'sdi-report-finger',
        component: () => import('@/views/sdi/ReportFingerView.vue'),
        meta: { menuCode: MENU.REPORT_FINGER_MANAGEMENT },
      },
      {
        path: 'readme',
        name: 'sdi-readme',
        component: () => import('@/views/sdi/ReadMeView.vue'),
        meta: { menuCode: MENU.SDI_README_MANAGEMENT },
      },
      {
        path: '403',
        name: 'sdi-forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },

  // ---- Prodi console ----
  // Versi cetak laporan (tanpa sidebar), dibuka di tab baru dari Laporan Capaian OBE.
  {
    path: '/prodi/cetak/laporan-capaian',
    name: 'prodi-laporan-capaian-cetak',
    component: () => import('@/views/prodi/kurikulum/LaporanCapaianCetakView.vue'),
    meta: { menuCode: MENU.PRODI_LAPORAN_CAPAIAN_MANAGEMENT },
  },
  {
    path: '/prodi',
    component: () => import('@/components/layout/ProdiLayout.vue'),
    children: [
      { path: '', redirect: '/prodi/beranda' },
      {
        path: 'kurikulum/laporan-capaian',
        name: 'prodi-laporan-capaian',
        component: () => import('@/views/prodi/kurikulum/LaporanCapaianView.vue'),
        meta: { menuCode: MENU.PRODI_LAPORAN_CAPAIAN_MANAGEMENT },
      },
      {
        path: 'beranda',
        name: 'prodi-dashboard',
        component: () => import('@/views/prodi/DashboardView.vue'),
        meta: { menuCode: MENU.PRODI_DASHBOARD },
      },
      {
        path: 'lulusan',
        name: 'prodi-lulusan',
        component: () => import('@/views/prodi/LulusanView.vue'),
        meta: { menuCode: MENU.PRODI_LULUSAN_MANAGEMENT },
      },
      {
        path: 'yudisium',
        name: 'prodi-yudisium',
        component: () => import('@/views/prodi/YudisiumView.vue'),
        meta: { menuCode: MENU.PRODI_YUDISIUM_MANAGEMENT },
      },
      {
        path: 'dosen',
        name: 'prodi-dosen',
        component: () => import('@/views/prodi/DosenView.vue'),
        meta: { menuCode: MENU.PRODI_DOSEN_MANAGEMENT },
      },
      {
        path: 'sidang/periode-pengajuan-ta',
        name: 'prodi-periode-pengajuan-ta',
        component: () => import('@/views/prodi/PeriodePengajuanTaView.vue'),
        meta: { menuCode: MENU.PRODI_PERIODE_PENGAJUAN_TA_MANAGEMENT },
      },
      {
        path: 'sidang/pengajuan-ta',
        name: 'prodi-pengajuan-ta',
        component: () => import('@/views/prodi/PengajuanTaView.vue'),
        meta: { menuCode: MENU.PRODI_PENGAJUAN_TA_MANAGEMENT },
      },
      {
        path: 'sidang/jadwal-sidang',
        name: 'prodi-jadwal-sidang',
        component: () => import('@/views/prodi/JadwalSidangView.vue'),
        meta: { menuCode: MENU.PRODI_JADWAL_SIDANG_MANAGEMENT },
      },
      {
        path: 'sidang/pendaftar-sidang',
        name: 'prodi-pendaftar-sidang',
        component: () => import('@/views/prodi/PendaftarSidangView.vue'),
        meta: { menuCode: MENU.PRODI_PENDAFTAR_SIDANG_MANAGEMENT },
      },
      {
        path: 'sidang/rekap-bimbingan',
        name: 'prodi-rekap-bimbingan',
        component: () => import('@/views/prodi/RekapBimbinganView.vue'),
        meta: { menuCode: MENU.PRODI_REKAP_BIMBINGAN_MANAGEMENT },
      },
      {
        path: 'bimbingan/pembimbing-magang',
        name: 'prodi-pembimbing-magang',
        component: () => import('@/views/prodi/PembimbingMagangView.vue'),
        meta: { menuCode: MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT },
      },
      {
        path: 'bimbingan/bimbingan-magang',
        name: 'prodi-bimbingan-magang',
        component: () => import('@/views/prodi/BimbinganMagangView.vue'),
        meta: { menuCode: MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT },
      },
      {
        path: 'bimbingan/pembimbing-ta-skripsi',
        name: 'prodi-pembimbing-ta-skripsi',
        component: () => import('@/views/prodi/PembimbingTaSkripsiView.vue'),
        meta: { menuCode: MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT },
      },
      {
        path: 'bimbingan/pembimbing-akademik',
        name: 'prodi-pembimbing-akademik',
        component: () => import('@/views/prodi/PembimbingAkademikView.vue'),
        meta: { menuCode: MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT },
      },
      {
        path: 'nilai/nilai-perkelas',
        name: 'prodi-nilai-perkelas',
        component: () => import('@/views/prodi/NilaiPerkelasView.vue'),
        meta: { menuCode: MENU.PRODI_NILAI_PERKELAS_MANAGEMENT },
      },
      {
        path: 'nilai/nilai-perkelas/:id',
        name: 'prodi-nilai-perkelas-detail',
        component: () => import('@/views/prodi/NilaiPerkelasDetailView.vue'),
        meta: { menuCode: MENU.PRODI_NILAI_PERKELAS_MANAGEMENT },
        props: true,
      },
      {
        path: 'nilai/nilai-mahasiswa',
        name: 'prodi-nilai-mahasiswa',
        component: () => import('@/views/prodi/nilai/NilaiMahasiswaView.vue'),
        meta: { menuCode: MENU.PRODI_NILAI_MAHASISWA_MANAGEMENT },
      },
      {
        path: 'nilai/nilai-mahasiswa/:mahasiswaId',
        name: 'prodi-nilai-mahasiswa-detail',
        component: () => import('@/views/prodi/nilai/NilaiMahasiswaDetailView.vue'),
        meta: { menuCode: MENU.PRODI_NILAI_MAHASISWA_MANAGEMENT },
        props: true,
      },
      {
        path: 'nilai/nilai-magang',
        name: 'prodi-nilai-magang',
        component: () => import('@/views/prodi/nilai/NilaiMagangView.vue'),
        meta: { menuCode: MENU.PRODI_NILAI_MAGANG_MANAGEMENT },
      },
      {
        path: 'nilai/konversi-nilai',
        name: 'prodi-konversi-nilai',
        component: () => import('@/views/prodi/nilai/KonversiNilaiView.vue'),
        meta: { menuCode: MENU.PRODI_KONVERSI_NILAI_MANAGEMENT },
      },
      {
        path: 'nilai/penghapusan-nilai',
        name: 'prodi-penghapusan-nilai',
        component: () => import('@/views/prodi/nilai/PenghapusanNilaiView.vue'),
        meta: { menuCode: MENU.PRODI_PENGHAPUSAN_NILAI_MANAGEMENT },
      },
      {
        path: 'nilai/update-nilai',
        name: 'prodi-update-nilai',
        component: () => import('@/views/prodi/nilai/UpdateNilaiView.vue'),
        meta: { menuCode: MENU.PRODI_UPDATE_NILAI_MANAGEMENT },
      },
      {
        path: 'nilai/voc-dosen-ftid',
        name: 'prodi-voc-dosen-ftid',
        component: () => import('@/views/prodi/nilai/VocDosenFtidView.vue'),
        meta: { menuCode: MENU.PRODI_VOC_DOSEN_FTID_MANAGEMENT },
      },
      {
        path: 'nilai/voc-dosen-ftid/:dosenId',
        name: 'prodi-voc-dosen-ftid-detail',
        component: () => import('@/views/prodi/nilai/VocDosenFtidDetailView.vue'),
        meta: { menuCode: MENU.PRODI_VOC_DOSEN_FTID_MANAGEMENT },
      },
      {
        path: 'nilai/bobot-obe',
        name: 'prodi-bobot-obe',
        component: () => import('@/views/prodi/nilai/BobotObeView.vue'),
        meta: { menuCode: MENU.PRODI_BOBOT_OBE_MANAGEMENT },
      },
      {
        path: 'nilai/voc-ujian-ftid',
        name: 'prodi-voc-ujian-ftid',
        component: () => import('@/views/prodi/nilai/VocUjianFtidView.vue'),
        meta: { menuCode: MENU.PRODI_VOC_UJIAN_FTID_MANAGEMENT },
      },
      {
        // Hasil angket pelayanan mahasiswa.
        path: 'angket-pelayanan',
        name: 'prodi-angket-pelayanan',
        component: () => import('@/views/prodi/AngketPelayananView.vue'),
        meta: { menuCode: MENU.PRODI_ANGKET_PELAYANAN_MANAGEMENT },
      },
      {
        // Kelola pertanyaan angket pelayanan (CRUD).
        path: 'pertanyaan-angket',
        name: 'prodi-pertanyaan-angket',
        component: () => import('@/views/prodi/PertanyaanAngketView.vue'),
        meta: { menuCode: MENU.PRODI_PERTANYAAN_ANGKET_MANAGEMENT },
      },
      {
        // Master pertanyaan angket dosen (penilaian dosen oleh mahasiswa).
        path: 'angket-dosen-pertanyaan',
        name: 'prodi-angket-dosen-pertanyaan',
        component: () => import('@/views/prodi/AngketDosenPertanyaanView.vue'),
        meta: { menuCode: MENU.PRODI_ANGKET_DOSEN_PERTANYAAN_MANAGEMENT },
      },
      {
        path: 'jadwal-kuliah/realisasi-dosen',
        name: 'prodi-realisasi-dosen',
        component: () => import('@/views/prodi/jadwal/RealisasiDosenView.vue'),
        meta: { menuCode: MENU.PRODI_REALISASI_DOSEN_MANAGEMENT },
      },
      {
        path: 'jadwal-kuliah/monitoring-jadwal',
        name: 'prodi-monitoring-jadwal',
        component: () => import('@/views/baak/MonitoringView.vue'),
        meta: { menuCode: MENU.PRODI_MONITORING_JADWAL_MANAGEMENT },
        props: { modul: 'prodi' },
      },
      {
        path: 'jadwal-kuliah/monitoring-jadwal/:id',
        name: 'prodi-monitoring-jadwal-detail',
        component: () => import('@/views/baak/MonitoringDetailView.vue'),
        meta: { menuCode: MENU.PRODI_MONITORING_JADWAL_MANAGEMENT },
        props: (route) => ({ id: String(route.params.id), modul: 'prodi' }),
      },
      {
        path: 'jadwal-kuliah/jadwal-kuliah',
        name: 'prodi-jadwal-kuliah',
        component: () => import('@/views/prodi/jadwal/JadwalKuliahView.vue'),
        meta: { menuCode: MENU.PRODI_JADWAL_KULIAH_MANAGEMENT },
      },
      {
        path: 'jadwal-kuliah/jadwal-ujian',
        name: 'prodi-jadwal-ujian',
        component: () => import('@/views/prodi/jadwal/JadwalUjianView.vue'),
        meta: { menuCode: MENU.PRODI_JADWAL_UJIAN_MANAGEMENT },
      },
      {
        path: 'kurikulum/kurikulum',
        name: 'prodi-kurikulum',
        component: () => import('@/views/prodi/kurikulum/KurikulumView.vue'),
        meta: { menuCode: MENU.PRODI_KURIKULUM_MANAGEMENT },
      },
      {
        path: 'kurikulum/kurikulum/:id',
        name: 'prodi-kurikulum-detail',
        component: () => import('@/views/prodi/kurikulum/KurikulumDetailView.vue'),
        meta: { menuCode: MENU.PRODI_KURIKULUM_MANAGEMENT },
        props: true,
      },
      {
        path: 'kurikulum/matakuliah-aktif',
        name: 'prodi-matakuliah-aktif',
        component: () => import('@/views/prodi/kurikulum/MatakuliahAktifView.vue'),
        meta: { menuCode: MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT },
      },
      {
        path: 'laporan/obe',
        name: 'prodi-laporan-obe',
        component: () => import('@/views/prodi/laporan/LaporanObeView.vue'),
        meta: { menuCode: MENU.PRODI_LAPORAN_OBE_MANAGEMENT },
      },
      {
        path: 'perkuliahan/e-learning',
        name: 'prodi-e-learning',
        component: () => import('@/views/prodi/perkuliahan/PerkuliahanComingSoonView.vue'),
        meta: { menuCode: MENU.PRODI_E_LEARNING_MANAGEMENT, title: 'E-learning', subtitle: 'Pembelajaran Akademik', icon: 'import_contacts' },
      },
      {
        path: 'perkuliahan/mata-kuliah',
        name: 'prodi-perkuliahan-mata-kuliah',
        component: () => import('@/views/prodi/perkuliahan/MataKuliahPerkuliahanView.vue'),
        meta: { menuCode: MENU.PRODI_PERKULIAHAN_MATA_KULIAH_MANAGEMENT },
      },
      {
        path: 'perkuliahan/mata-kuliah/:id/rps',
        name: 'prodi-perkuliahan-mata-kuliah-rps',
        component: () => import('@/views/prodi/kurikulum/RpsMataKuliahView.vue'),
        meta: {
          menuCode: MENU.PRODI_PERKULIAHAN_MATA_KULIAH_MANAGEMENT,
          backRoute: 'prodi-perkuliahan-mata-kuliah',
          breadcrumb: 'Prodi / Perkuliahan / Mata Kuliah',
        },
        props: true,
      },
      {
        path: 'perkuliahan/kelas-kuliah',
        name: 'prodi-kelas-kuliah',
        component: () => import('@/views/prodi/perkuliahan/KelasKuliahView.vue'),
        meta: { menuCode: MENU.PRODI_KELAS_KULIAH_MANAGEMENT },
      },
      {
        path: 'perkuliahan/kelas-kuliah/:id',
        name: 'prodi-kelas-kuliah-detail',
        component: () => import('@/views/prodi/perkuliahan/KelasKuliahDetailView.vue'),
        meta: { menuCode: MENU.PRODI_KELAS_KULIAH_MANAGEMENT },
        props: true,
      },
      {
        path: 'perkuliahan/aktivitas-prestasi',
        name: 'prodi-aktivitas-prestasi',
        component: () => import('@/views/prodi/perkuliahan/PerkuliahanComingSoonView.vue'),
        meta: { menuCode: MENU.PRODI_AKTIVITAS_PRESTASI_MANAGEMENT, title: 'Aktivitas & Prestasi', subtitle: 'Kegiatan Mahasiswa Wali', icon: 'emoji_events' },
      },
      {
        path: 'setting',
        name: 'prodi-setting',
        component: () => import('@/views/prodi/SettingProdiView.vue'),
        meta: { menuCode: MENU.PRODI_SETTING_MANAGEMENT },
      },
      {
        path: 'setting/:id',
        name: 'prodi-setting-detail',
        component: () => import('@/views/prodi/SettingProdiDetailView.vue'),
        meta: { menuCode: MENU.PRODI_SETTING_MANAGEMENT },
        props: true,
      },
      {
        path: 'kurikulum/matakuliah-aktif/:id/rps',
        name: 'prodi-matakuliah-aktif-rps',
        component: () => import('@/views/prodi/kurikulum/RpsMataKuliahView.vue'),
        meta: { menuCode: MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT },
        props: true,
      },
      {
        path: 'kurikulum/konversi-kurikulum',
        name: 'prodi-konversi-kurikulum',
        component: () => import('@/views/prodi/kurikulum/KonversiKurikulumView.vue'),
        meta: { menuCode: MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT },
      },
      {
        path: 'kurikulum/manajemen-capaian',
        name: 'prodi-manajemen-capaian',
        component: () => import('@/views/prodi/kurikulum/ManajemenCapaianView.vue'),
        meta: { menuCode: MENU.PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT },
      },
      {
        path: 'kurikulum/manajemen-capaian/:id',
        name: 'prodi-manajemen-capaian-detail',
        component: () => import('@/views/prodi/kurikulum/ManajemenCapaianDetailView.vue'),
        meta: { menuCode: MENU.PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT },
        props: true,
      },
      {
        path: 'mahasiswa/generate-aktif',
        name: 'prodi-generate-mahasiswa-aktif',
        component: () => import('@/views/prodi/mahasiswa/GenerateMahasiswaAktifView.vue'),
        meta: { menuCode: MENU.PRODI_GENERATE_MAHASISWA_AKTIF_MANAGEMENT },
      },
      {
        path: 'mahasiswa/keluar',
        name: 'prodi-mahasiswa-keluar',
        component: () => import('@/views/prodi/mahasiswa/MahasiswaKeluarView.vue'),
        meta: { menuCode: MENU.PRODI_MAHASISWA_KELUAR_MANAGEMENT },
      },
      {
        path: 'mahasiswa/cuti',
        name: 'prodi-mahasiswa-cuti',
        component: () => import('@/views/prodi/mahasiswa/MahasiswaCutiView.vue'),
        meta: { menuCode: MENU.PRODI_MAHASISWA_CUTI_MANAGEMENT },
      },
      {
        path: 'mahasiswa/habis-masa-studi',
        name: 'prodi-habis-masa-studi',
        component: () => import('@/views/prodi/mahasiswa/HabisMasaStudiView.vue'),
        meta: { menuCode: MENU.PRODI_HABIS_MASA_STUDI_MANAGEMENT },
      },
      {
        path: 'mahasiswa/evaluasi-studi',
        name: 'prodi-evaluasi-studi',
        component: () => import('@/views/prodi/mahasiswa/EvaluasiStudiView.vue'),
        meta: { menuCode: MENU.PRODI_EVALUASI_STUDI_MANAGEMENT },
      },
      {
        path: 'mahasiswa/krs',
        name: 'prodi-krs-mahasiswa',
        component: () => import('@/views/prodi/mahasiswa/KrsMahasiswaView.vue'),
        meta: { menuCode: MENU.PRODI_KRS_MANAGEMENT },
      },
      {
        path: 'mahasiswa/monitoring-frs',
        name: 'prodi-monitoring-frs',
        component: () => import('@/views/prodi/mahasiswa/MonitoringFrsView.vue'),
        meta: { menuCode: MENU.PRODI_MONITORING_FRS_MANAGEMENT },
      },
      {
        path: 'mahasiswa/biodata',
        name: 'prodi-biodata-mahasiswa',
        component: () => import('@/views/prodi/mahasiswa/BiodataMahasiswaView.vue'),
        meta: { menuCode: MENU.PRODI_BIODATA_MAHASISWA_MANAGEMENT },
      },
      {
        path: 'readme',
        name: 'prodi-readme',
        component: () => import('@/views/prodi/ReadMeView.vue'),
        meta: { menuCode: MENU.PRODI_README_MANAGEMENT },
      },
      {
        path: '403',
        name: 'prodi-forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },

  // ---- Keuangan console ----
  {
    path: '/keuangan',
    component: () => import('@/components/layout/KeuanganLayout.vue'),
    children: [
      { path: '', redirect: '/keuangan/dashboard' },
      {
        path: 'dashboard',
        name: 'keuangan-dashboard',
        component: () => import('@/views/keuangan/DashboardView.vue'),
        meta: { menuCode: MENU.KEUANGAN_DASHBOARD },
      },
      {
        path: 'master/keringanan',
        name: 'keuangan-keringanan',
        component: () => import('@/views/keuangan/master/KeringananView.vue'),
        meta: { menuCode: MENU.KEUANGAN_KERINGANAN_MANAGEMENT },
      },
      {
        path: 'master/tarif-ta-skripsi',
        name: 'keuangan-tarif-ta-skripsi',
        component: () => import('@/views/keuangan/master/TarifTaSkripsiView.vue'),
        meta: { menuCode: MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT },
      },
      {
        path: 'master/batas-tagihan-akademik',
        name: 'keuangan-batas-tagihan-akademik',
        component: () => import('@/views/keuangan/master/BatasTagihanAkademikView.vue'),
        meta: { menuCode: MENU.KEUANGAN_BATAS_TAGIHAN_AKADEMIK_MANAGEMENT },
      },
      {
        path: 'master/tarif-pembimbing',
        name: 'keuangan-tarif-pembimbing',
        component: () => import('@/views/keuangan/master/TarifPembimbingView.vue'),
        meta: { menuCode: MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT },
      },
      {
        path: 'master/tarif-biaya-lain',
        name: 'keuangan-tarif-biaya-lain',
        component: () => import('@/views/keuangan/master/TarifBiayaLainView.vue'),
        meta: { menuCode: MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT },
      },
      {
        path: 'master/tarif-biaya-kuliah',
        name: 'keuangan-tarif-biaya-kuliah',
        component: () => import('@/views/keuangan/master/TarifBiayaKuliahView.vue'),
        meta: { menuCode: MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT },
      },
      {
        path: 'master/generate-tagihan',
        name: 'keuangan-generate-tagihan',
        component: () => import('@/views/keuangan/master/GenerateTagihanView.vue'),
        meta: { menuCode: MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT },
      },
      {
        path: 'master/daftar-potongan',
        name: 'keuangan-daftar-potongan',
        component: () => import('@/views/keuangan/master/DaftarPotonganView.vue'),
        meta: { menuCode: MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT },
      },
      {
        path: 'transaksi/pembayaran-sertifikasi',
        name: 'keuangan-pembayaran-sertifikasi',
        component: () => import('@/views/keuangan/transaksi/PembayaranSertifikasiView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT },
      },
      {
        path: 'transaksi/voc-ujian',
        name: 'keuangan-voc-ujian',
        component: () => import('@/views/keuangan/transaksi/VocUjianView.vue'),
        meta: { menuCode: MENU.KEUANGAN_VOC_UJIAN_MANAGEMENT },
      },
      {
        path: 'transaksi/pembayaran-sp',
        name: 'keuangan-pembayaran-sp',
        component: () => import('@/views/keuangan/transaksi/PembayaranSpView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PEMBAYARAN_SP_MANAGEMENT },
      },
      {
        path: 'transaksi/voc-sp',
        name: 'keuangan-voc-sp',
        component: () => import('@/views/keuangan/transaksi/VocSpView.vue'),
        meta: { menuCode: MENU.KEUANGAN_VOC_SP_MANAGEMENT },
      },
      {
        path: 'transaksi/pembayaran-kuliah',
        name: 'keuangan-pembayaran-kuliah',
        component: () => import('@/views/keuangan/transaksi/PembayaranKuliahView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT },
      },
      {
        path: 'transaksi/pembayaran-ta-skripsi',
        name: 'keuangan-pembayaran-ta-skripsi',
        component: () => import('@/views/keuangan/transaksi/PembayaranTaSkripsiView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT },
      },
      {
        path: 'transaksi/perpanjangan-ta-skripsi',
        name: 'keuangan-perpanjangan-ta-skripsi',
        component: () => import('@/views/keuangan/transaksi/PerpanjanganTaSkripsiView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PERPANJANGAN_TA_SKRIPSI_MANAGEMENT },
      },
      {
        path: 'transaksi/pembayaran-wisuda',
        name: 'keuangan-pembayaran-wisuda',
        component: () => import('@/views/keuangan/transaksi/PembayaranWisudaView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT },
      },
      {
        path: 'transaksi/pembayaran-wisuda/:mahasiswaId',
        name: 'keuangan-pembayaran-wisuda-detail',
        component: () => import('@/views/keuangan/transaksi/PembayaranWisudaDetailView.vue'),
        meta: { menuCode: MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT },
        props: true,
      },
      {
        path: 'laporan/tunggakan-mahasiswa',
        name: 'keuangan-laporan-tunggakan-mahasiswa',
        component: () => import('@/views/keuangan/laporan/TunggakanMahasiswaView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT },
      },
      {
        path: 'laporan/uang-kuliah',
        name: 'keuangan-laporan-uang-kuliah',
        component: () => import('@/views/keuangan/laporan/LaporanUangKuliahView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_UANG_KULIAH_MANAGEMENT },
      },
      {
        path: 'laporan/lain',
        name: 'keuangan-laporan-lain',
        component: () => import('@/views/keuangan/laporan/LaporanLainView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_LAIN_MANAGEMENT },
      },
      {
        path: 'laporan/bebas-tunggakan',
        name: 'keuangan-laporan-bebas-tunggakan',
        component: () => import('@/views/keuangan/laporan/LaporanBebasTunggakanView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_BEBAS_TUNGGAKAN_MANAGEMENT },
      },
      {
        path: 'laporan/tunggakan',
        name: 'keuangan-laporan-tunggakan',
        component: () => import('@/views/keuangan/laporan/LaporanTunggakanView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MANAGEMENT },
      },
      {
        path: 'laporan/sertifikasi',
        name: 'keuangan-laporan-sertifikasi',
        component: () => import('@/views/keuangan/laporan/LaporanSertifikasiView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_SERTIFIKASI_MANAGEMENT },
      },
      {
        path: 'laporan/kti-skripsi',
        name: 'keuangan-laporan-kti-skripsi',
        component: () => import('@/views/keuangan/laporan/LaporanKtiSkripsiView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_KTI_SKRIPSI_MANAGEMENT },
      },
      {
        path: 'laporan/semester-pendek',
        name: 'keuangan-laporan-semester-pendek',
        component: () => import('@/views/keuangan/laporan/LaporanSemesterPendekView.vue'),
        meta: { menuCode: MENU.KEUANGAN_LAPORAN_SEMESTER_PENDEK_MANAGEMENT },
      },
      {
        path: 'akuntansi/buku-besar',
        name: 'keuangan-buku-besar',
        component: () => import('@/views/keuangan/akuntansi/BukuBesarView.vue'),
        meta: { menuCode: MENU.KEUANGAN_BUKU_BESAR_MANAGEMENT },
      },
      {
        path: 'akuntansi/neraca',
        name: 'keuangan-neraca',
        component: () => import('@/views/keuangan/akuntansi/NeracaView.vue'),
        meta: { menuCode: MENU.KEUANGAN_NERACA_MANAGEMENT },
      },
      {
        path: 'readme',
        name: 'keuangan-readme',
        component: () => import('@/views/keuangan/ReadMeView.vue'),
        meta: { menuCode: MENU.KEUANGAN_README_MANAGEMENT },
      },
      {
        path: 'audit-log',
        name: 'keuangan-audit-log',
        component: () => import('@/views/system/AuditLogView.vue'),
        meta: { menuCode: MENU.KEUANGAN_AUDIT_LOG_MANAGEMENT },
      },
      {
        path: '403',
        name: 'keuangan-forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },

  // ---- Modul Admin (superadmin) ----
  {
    path: '/modul-admin',
    component: () => import('@/components/layout/ModulAdminLayout.vue'),
    children: [
      { path: '', redirect: '/modul-admin/impersonasi' },
      {
        path: 'readme',
        name: 'admin-readme',
        component: () => import('@/views/admin/ReadMeView.vue'),
        meta: { menuCode: MENU.ADMIN_README_MANAGEMENT },
      },
      {
        path: 'impersonasi',
        name: 'impersonasi',
        component: () => import('@/views/system/ImpersonasiView.vue'),
        meta: { menuCode: MENU.IMPERSONASI_MANAGEMENT },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/system/UsersView.vue'),
        meta: { menuCode: MENU.USER_MANAGEMENT },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/system/RolesView.vue'),
        meta: { menuCode: MENU.ROLE_MANAGEMENT },
      },
      {
        path: 'roles/:id/permissions',
        name: 'role-permissions',
        component: () => import('@/views/system/RolePermissionsView.vue'),
        meta: { menuCode: MENU.ROLE_MANAGEMENT },
        props: true,
      },
      {
        path: 'tahun-ajaran',
        name: 'tahun-ajaran',
        component: () => import('@/views/baak/TahunAjaranView.vue'),
        meta: { menuCode: MENU.TAHUN_AJARAN_MANAGEMENT },
      },
      {
        path: 'master/ruangan',
        name: 'admin-master-ruangan',
        component: () => import('@/views/admin/master/RuanganView.vue'),
        meta: { menuCode: MENU.RUANGAN_MANAGEMENT },
      },
      // Sub menu Master lain: sementara "Segera Hadir" sampai CRUD-nya dibuat.
      {
        path: 'master/agama',
        name: 'admin-master-agama',
        component: () => import('@/views/admin/master/AgamaView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_AGAMA_MANAGEMENT, title: 'Agama' },
      },
      {
        path: 'master/tahun',
        name: 'admin-master-tahun',
        component: () => import('@/views/admin/master/MasterComingSoonView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_TAHUN_AKADEMIK_MANAGEMENT, title: 'Tahun (Prodi, BAAK, MHS, Dosen, Pos & SDM)' },
      },
      {
        path: 'master/tahun-keuangan',
        name: 'admin-master-tahun-keuangan',
        component: () => import('@/views/admin/master/TahunModulView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_TAHUN_KEUANGAN_MANAGEMENT, title: 'Tahun (Kasir & Keuangan)', modul: 'keuangan' },
      },
      {
        path: 'master/tahun-pmb',
        name: 'admin-master-tahun-pmb',
        component: () => import('@/views/admin/master/TahunModulView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_TAHUN_PMB_MANAGEMENT, title: 'Tahun (PMB)', modul: 'pmb' },
      },
      {
        path: 'master/tahun-frs',
        name: 'admin-master-tahun-frs',
        component: () => import('@/views/admin/master/MasterComingSoonView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_TAHUN_FRS_MANAGEMENT, title: 'Tahun (FRS)' },
      },
      {
        path: 'master/tahun-ta-skripsi',
        name: 'admin-master-tahun-ta-skripsi',
        component: () => import('@/views/admin/master/MasterComingSoonView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_TAHUN_TA_SKRIPSI_MANAGEMENT, title: 'Tahun TA/Skripsi' },
      },
      {
        path: 'master/tahun-sp',
        name: 'admin-master-tahun-sp',
        component: () => import('@/views/admin/master/MasterComingSoonView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_TAHUN_SP_MANAGEMENT, title: 'Tahun SP' },
      },
      {
        path: 'master/prodi',
        name: 'admin-master-prodi',
        component: () => import('@/views/master/JurusanView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_PRODI_MANAGEMENT, title: 'Prodi' },
        props: { menuCode: MENU.ADMIN_MASTER_PRODI_MANAGEMENT },
      },
      {
        path: 'master/karyawan',
        name: 'admin-master-karyawan',
        component: () => import('@/views/sdi/KaryawanView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_KARYAWAN_MANAGEMENT, title: 'Karyawan' },
        props: { menuCode: MENU.ADMIN_MASTER_KARYAWAN_MANAGEMENT },
      },
      {
        path: 'master/dosen',
        name: 'admin-master-dosen',
        component: () => import('@/views/sdi/DosenView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_DOSEN_MANAGEMENT, title: 'Dosen' },
        props: { menuCode: MENU.ADMIN_MASTER_DOSEN_MANAGEMENT },
      },
      {
        path: 'master/mahasiswa',
        name: 'admin-master-mahasiswa',
        component: () => import('@/views/admin/master/MasterComingSoonView.vue'),
        meta: { menuCode: MENU.ADMIN_MASTER_MAHASISWA_MANAGEMENT, title: 'Mahasiswa' },
      },
    ],
  },
  // Alamat lama menu Impersonasi (sempat di console PMB).
  { path: '/admin/impersonasi', redirect: '/modul-admin/impersonasi' },
  // Alamat lama User/Role Management (console PMB) & Tahun Ajaran (console BAAK).
  { path: '/admin/users', redirect: '/modul-admin/users' },
  { path: '/admin/roles', redirect: '/modul-admin/roles' },
  { path: '/admin/roles/:id/permissions', redirect: (to) => `/modul-admin/roles/${to.params.id}/permissions` },
  { path: '/baak/tahun-ajaran', redirect: '/modul-admin/tahun-ajaran' },
  // ---- LMS console (Learning Management System) ----
  {
    // Halaman login LMS tersendiri (gaya portal e-learning): Siakad (dosen / mahasiswa), email, atau username staf.
    path: '/lms/login',
    name: 'lms-login',
    component: () => import('@/views/lms/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/lms',
    component: () => import('@/components/layout/LmsLayout.vue'),
    children: [
      { path: '', redirect: '/lms/dashboard' },
      {
        path: 'dashboard',
        name: 'lms-dashboard',
        component: () => import('@/views/lms/DashboardView.vue'),
        meta: { menuCode: MENU.LMS_DASHBOARD },
      },
      {
        path: 'kelas',
        name: 'lms-kelas',
        component: () => import('@/views/lms/KelasView.vue'),
        meta: { menuCode: MENU.LMS_KELAS_MANAGEMENT },
      },
      {
        path: 'kelas/:id',
        name: 'lms-kelas-detail',
        component: () => import('@/views/lms/KelasDetailView.vue'),
        meta: { menuCode: MENU.LMS_KELAS_MANAGEMENT },
      },
      {
        // Materi / Tugas / Kuis memakai halaman yang sama (meta.sumber = endpoint konsol LMS).
        path: 'materi',
        name: 'lms-materi',
        component: () => import('@/views/lms/KontenView.vue'),
        meta: { menuCode: MENU.LMS_MATERI_MANAGEMENT, sumber: 'materi' },
      },
      {
        path: 'tugas',
        name: 'lms-tugas',
        component: () => import('@/views/lms/KontenView.vue'),
        meta: { menuCode: MENU.LMS_TUGAS_MANAGEMENT, sumber: 'tugas' },
      },
      {
        path: 'kuis',
        name: 'lms-kuis',
        component: () => import('@/views/lms/KontenView.vue'),
        meta: { menuCode: MENU.LMS_KUIS_MANAGEMENT, sumber: 'kuis' },
      },
      {
        path: 'forum',
        name: 'lms-forum',
        component: () => import('@/views/lms/ForumView.vue'),
        meta: { menuCode: MENU.LMS_FORUM_MANAGEMENT },
      },
      {
        // Data pengumuman yang sama dengan BAAK → Pengumuman (tampil sebagai Berita Kampus di e-learning).
        path: 'pengumuman',
        name: 'lms-pengumuman',
        component: () => import('@/views/baak/PengumumanView.vue'),
        meta: { menuCode: MENU.LMS_PENGUMUMAN_MANAGEMENT },
      },
      {
        path: 'readme',
        name: 'lms-readme',
        component: () => import('@/views/lms/ReadMeView.vue'),
        meta: { menuCode: MENU.LMS_README_MANAGEMENT },
      },
      {
        path: 'laporan',
        name: 'lms-laporan',
        component: () => import('@/views/lms/LaporanView.vue'),
        meta: { menuCode: MENU.LMS_LAPORAN_MANAGEMENT },
      },
      {
        path: '403',
        name: 'lms-forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },
  // ---- SIM console ----
  {
    path: '/sim',
    component: () => import('@/components/layout/SimLayout.vue'),
    children: [
      { path: '', redirect: '/sim/dashboard' },
      {
        path: 'dashboard',
        name: 'sim-dashboard',
        component: () => import('@/views/sim/DashboardView.vue'),
        meta: { menuCode: MENU.SIM_DASHBOARD },
      },
      {
        path: 'master/student-body',
        name: 'sim-student-body',
        component: () => import('@/views/sim/master/StudentBodyView.vue'),
        meta: { menuCode: MENU.SIM_STUDENT_BODY_MANAGEMENT },
      },
      {
        path: 'master/presentase-kehadiran',
        name: 'sim-presentase-kehadiran',
        component: () => import('@/views/sim/master/PresentaseKehadiranView.vue'),
        meta: { menuCode: MENU.SIM_PRESENTASE_KEHADIRAN_MANAGEMENT },
      },
      {
        path: 'master/kehadiran-kelas',
        name: 'sim-kehadiran-kelas',
        component: () => import('@/views/sim/master/KehadiranKelasView.vue'),
        meta: { menuCode: MENU.SIM_KEHADIRAN_KELAS_MANAGEMENT },
      },
      {
        path: 'master/frs',
        name: 'sim-frs',
        component: () => import('@/views/sim/master/FrsView.vue'),
        meta: { menuCode: MENU.SIM_FRS_MANAGEMENT },
      },
      {
        path: 'master/ujian',
        name: 'sim-ujian',
        component: () => import('@/views/sim/master/UjianView.vue'),
        meta: { menuCode: MENU.SIM_UJIAN_MANAGEMENT },
      },
      {
        path: 'master/aktif',
        name: 'sim-aktif',
        component: () => import('@/views/sim/master/AktifView.vue'),
        meta: { menuCode: MENU.SIM_AKTIF_MANAGEMENT },
      },
      {
        path: 'master/ipk',
        name: 'sim-ipk',
        component: () => import('@/views/sim/master/IpkView.vue'),
        meta: { menuCode: MENU.SIM_IPK_MANAGEMENT },
      },
      {
        path: 'master/lulusan',
        name: 'sim-lulusan',
        component: () => import('@/views/sim/master/LulusanView.vue'),
        meta: { menuCode: MENU.SIM_LULUSAN_MANAGEMENT },
      },
      {
        path: 'master/nilai-d-e',
        name: 'sim-nilai-d-e',
        component: () => import('@/views/sim/master/NilaiDEView.vue'),
        meta: { menuCode: MENU.SIM_NILAI_D_E_MANAGEMENT },
      },
      {
        path: 'transaksi/cetak-kehadiran-mengajar',
        name: 'sim-cetak-kehadiran-mengajar',
        component: () => import('@/views/sim/transaksi/CetakKehadiranMengajarView.vue'),
        meta: { menuCode: MENU.SIM_TRANSAKSI_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT },
      },
      {
        path: 'transaksi/rekapitulasi-pengajaran',
        name: 'sim-rekapitulasi-pengajaran',
        component: () => import('@/views/sim/transaksi/RekapitulasiPengajaranView.vue'),
        meta: { menuCode: MENU.SIM_TRANSAKSI_REKAPITULASI_PENGAJARAN_MANAGEMENT },
      },
      {
        path: 'feeder',
        name: 'sim-feeder',
        component: () => import('@/views/sim/FeederView.vue'),
        meta: { menuCode: MENU.SIM_FEEDER_MANAGEMENT },
      },
      // Semua menu Feeder PDDIKTI memakai satu halaman generik.
      ...FEEDER_ENTITIES.map((e) => ({
        path: `feeder/${e.key}`,
        name: `sim-feeder-${e.key}`,
        component: () => import('@/views/sim/feeder/FeederEntityView.vue'),
        meta: { menuCode: e.menuCode, feederEntity: e.key },
      })),
      {
        path: 'tiket-mahasiswa',
        name: 'sim-tiket-mahasiswa',
        component: () => import('@/views/sim/TiketMahasiswaView.vue'),
        meta: { menuCode: MENU.SIM_TIKET_MAHASISWA_MANAGEMENT },
      },
      {
        path: 'panduan-smart',
        name: 'sim-panduan-smart',
        component: () => import('@/views/sim/PanduanSmartView.vue'),
        meta: { menuCode: MENU.SIM_PANDUAN_SMART_MANAGEMENT },
      },
      {
        path: 'panduan-akademik',
        name: 'sim-panduan-akademik',
        component: () => import('@/views/sim/PanduanAkademikView.vue'),
        meta: { menuCode: MENU.SIM_PANDUAN_AKADEMIK_MANAGEMENT },
      },
      {
        path: '403',
        name: 'sim-forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
      },
    ],
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.meta.dosenAuth) {
    const dosenAuthStore = useDosenAuthStore();
    if (!dosenAuthStore.ready) {
      await dosenAuthStore.bootstrap();
    }
    if (!dosenAuthStore.isAuthenticated) {
      return { name: 'dosen-login', query: { redirect: to.fullPath } };
    }
    return true;
  }

  if (to.meta.mahasiswaAuth) {
    const mahasiswaAuthStore = useMahasiswaAuthStore();
    if (!mahasiswaAuthStore.ready) {
      await mahasiswaAuthStore.bootstrap();
    }
    if (!mahasiswaAuthStore.isAuthenticated) {
      return { name: 'mahasiswa-login', query: { redirect: to.fullPath } };
    }
    return true;
  }

  if (to.meta.pesertaAuth) {
    const pesertaAuthStore = usePesertaAuthStore();
    if (!pesertaAuthStore.ready) {
      await pesertaAuthStore.bootstrap();
    }
    if (!pesertaAuthStore.isAuthenticated) {
      return { name: 'pendaftaran-masuk', query: { redirect: to.fullPath } };
    }
    // Password awal (nomor HP) harus diganti sebelum halaman pendaftaran lain bisa dibuka.
    if (pesertaAuthStore.peserta?.wajibGantiPassword && to.name !== 'pendaftaran-ganti-password') {
      return { name: 'pendaftaran-ganti-password', query: { redirect: to.fullPath } };
    }
    return true;
  }

  const authStore = useAuthStore();
  const menuStore = useMenuStore();

  if (to.meta.public) {
    // Halaman login tetap bisa dibuka walau masih ada sesi aktif, supaya bisa ganti akun (mis. Prodi
    // -> Keuangan). Sebelumnya user langsung dilempar ke modul pertama yang bisa diakses sesi lama,
    // jadi login sebagai Keuangan tidak pernah tercapai. LoginView menampilkan info sesi aktif.
    return true;
  }

  if (!authStore.isAuthenticated) {
    if (to.path.startsWith('/lms')) return { name: 'lms-login' };
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (!menuStore.loaded) {
    await menuStore.load();
  }

  const menuCode = to.meta.menuCode as string | undefined;
  if (menuCode && !authStore.permissionsFor(menuCode).canRead) {
    if (to.path.startsWith('/baak')) return { name: 'baak-forbidden' };
    if (to.path.startsWith('/sdi')) return { name: 'sdi-forbidden' };
    if (to.path.startsWith('/prodi')) return { name: 'prodi-forbidden' };
    if (to.path.startsWith('/keuangan')) return { name: 'keuangan-forbidden' };
    if (to.path.startsWith('/sim')) return { name: 'sim-forbidden' };
    if (to.path.startsWith('/lms')) return { name: 'lms-forbidden' };
    return { name: 'forbidden' };
  }

  return true;
});

export default router;
