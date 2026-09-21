import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { MENU } from '@/constants/menuCodes';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    menuCode?: string;
    pesertaAuth?: boolean;
    dosenAuth?: boolean;
    mahasiswaAuth?: boolean;
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
      { path: '', redirect: '/dosen/kehadiran-mengajar' },
      {
        path: 'kehadiran-mengajar',
        name: 'dosen-kehadiran-mengajar',
        component: () => import('@/views/dosen/KehadiranMengajarView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'rekap-mahasiswa',
        name: 'dosen-rekap-mahasiswa',
        component: () => import('@/views/dosen/RekapMahasiswaView.vue'),
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
        path: 'panduan-sistem',
        name: 'dosen-panduan-sistem',
        component: () => import('@/views/dosen/PanduanSistemView.vue'),
        meta: { dosenAuth: true },
      },
      {
        path: 'silabus-matakuliah',
        name: 'dosen-silabus-matakuliah',
        component: () => import('@/views/dosen/SilabusMatakuliahView.vue'),
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
        path: 'surat-keterangan',
        name: 'mahasiswa-surat-keterangan',
        component: () => import('@/views/mahasiswa/SuratKeteranganView.vue'),
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
        path: 'tahun-ajaran',
        name: 'baak-tahun-ajaran',
        component: () => import('@/views/baak/TahunAjaranView.vue'),
        meta: { menuCode: MENU.TAHUN_AJARAN_MANAGEMENT },
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
  {
    path: '/prodi',
    component: () => import('@/components/layout/ProdiLayout.vue'),
    children: [
      { path: '', redirect: '/prodi/beranda' },
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
        path: 'jadwal-kuliah/realisasi-dosen',
        name: 'prodi-realisasi-dosen',
        component: () => import('@/views/prodi/jadwal/RealisasiDosenView.vue'),
        meta: { menuCode: MENU.PRODI_REALISASI_DOSEN_MANAGEMENT },
      },
      {
        path: 'jadwal-kuliah/monitoring-jadwal',
        name: 'prodi-monitoring-jadwal',
        component: () => import('@/views/prodi/jadwal/MonitoringJadwalView.vue'),
        meta: { menuCode: MENU.PRODI_MONITORING_JADWAL_MANAGEMENT },
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
        path: 'kurikulum/matakuliah-aktif',
        name: 'prodi-matakuliah-aktif',
        component: () => import('@/views/prodi/kurikulum/MatakuliahAktifView.vue'),
        meta: { menuCode: MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT },
      },
      {
        path: 'kurikulum/konversi-kurikulum',
        name: 'prodi-konversi-kurikulum',
        component: () => import('@/views/prodi/kurikulum/KonversiKurikulumView.vue'),
        meta: { menuCode: MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT },
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
        path: 'transaksi/tunggakan-mahasiswa',
        name: 'keuangan-tunggakan-mahasiswa',
        component: () => import('@/views/keuangan/transaksi/TunggakanMahasiswaView.vue'),
        meta: { menuCode: MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT },
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
    return true;
  }

  const authStore = useAuthStore();
  const menuStore = useMenuStore();

  if (to.meta.public) {
    if (authStore.isAuthenticated && to.name === 'login') {
      // Redirect ke console yang benar-benar bisa diakses user, bukan selalu ke PMB —
      // sebelumnya hardcoded ke 'dashboard' (PMB) sehingga user yang hanya punya akses
      // Prodi/BAAK/SDI ikut terlempar ke PMB begitu token session mereka masih valid.
      const HOME_BY_MODULE: Record<string, { path: string; dashboardMenuCode: string }> = {
        pmb: { path: '/admin/dashboard', dashboardMenuCode: MENU.DASHBOARD },
        baak: { path: '/baak/dashboard', dashboardMenuCode: MENU.BAAK_DASHBOARD },
        sdi: { path: '/sdi/dashboard', dashboardMenuCode: MENU.SDI_DASHBOARD },
        prodi: { path: '/prodi/beranda', dashboardMenuCode: MENU.PRODI_DASHBOARD },
        keuangan: { path: '/keuangan/dashboard', dashboardMenuCode: MENU.KEUANGAN_DASHBOARD },
        sim: { path: '/sim/dashboard', dashboardMenuCode: MENU.SIM_DASHBOARD },
      };
      const accessibleModule = Object.values(HOME_BY_MODULE).find(
        (m) => authStore.permissionsFor(m.dashboardMenuCode).canRead
      );
      return { path: accessibleModule?.path ?? '/admin/dashboard' };
    }
    return true;
  }

  if (!authStore.isAuthenticated) {
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
    return { name: 'forbidden' };
  }

  return true;
});

export default router;
