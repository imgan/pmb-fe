import { MENU } from './menuCodes';

export type StaffModuleKey = 'pmb' | 'baak' | 'sdi' | 'prodi' | 'keuangan' | 'sim' | 'admin' | 'lms';

/**
 * Console staff per modul: halaman awal, prefix URL, dan menu dashboard yang menandai akun
 * punya akses ke modul tsb. Dipakai halaman login & router guard supaya user selalu masuk ke
 * modul yang ia pilih / yang benar-benar bisa ia akses.
 */
export const STAFF_MODULES: Record<StaffModuleKey, { label: string; home: string; prefix: string; dashboardMenuCode: string }> = {
  pmb: { label: 'PMB', home: '/admin/dashboard', prefix: '/admin', dashboardMenuCode: MENU.DASHBOARD },
  baak: { label: 'BAAK', home: '/baak/dashboard', prefix: '/baak', dashboardMenuCode: MENU.BAAK_DASHBOARD },
  sdi: { label: 'SDI', home: '/sdi/dashboard', prefix: '/sdi', dashboardMenuCode: MENU.SDI_DASHBOARD },
  prodi: { label: 'Prodi', home: '/prodi/beranda', prefix: '/prodi', dashboardMenuCode: MENU.PRODI_DASHBOARD },
  keuangan: { label: 'Keuangan', home: '/keuangan/dashboard', prefix: '/keuangan', dashboardMenuCode: MENU.KEUANGAN_DASHBOARD },
  sim: { label: 'SIM', home: '/sim/dashboard', prefix: '/sim', dashboardMenuCode: MENU.SIM_DASHBOARD },
  lms: { label: 'LMS', home: '/lms/dashboard', prefix: '/lms', dashboardMenuCode: MENU.LMS_DASHBOARD },
  // Modul Admin (superadmin) belum punya dashboard: akses ditandai menu Impersonasi Akun.
  admin: { label: 'Admin', home: '/modul-admin/impersonasi', prefix: '/modul-admin', dashboardMenuCode: MENU.IMPERSONASI_MANAGEMENT },
};
