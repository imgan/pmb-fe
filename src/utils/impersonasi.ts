import { academicContextStorage, staffModuleStorage, tokenStorage } from '@/api/http';
import { dosenTokenStorage } from '@/api/dosenHttp';
import { mahasiswaTokenStorage } from '@/api/mahasiswaHttp';
import type { ImpersonasiStaffResult } from '@/api/impersonasi';
import { useAuthStore } from '@/stores/auth';
import { STAFF_MODULES, type StaffModuleKey } from '@/constants/staffModules';

/**
 * Sesi impersonasi (Superadmin "masuk sebagai" akun lain).
 * - Staff: sesi admin disimpan sebagai cadangan lalu diganti token akun target; "Kembali ke akun
 *   admin" memulihkannya. Sesi staff dipakai bersama semua tab (lihat main.ts).
 * - Dosen/Mahasiswa: token portal diisi token akun target lalu portal dibuka di tab baru; sesi
 *   admin tidak tersentuh.
 * Penanda disimpan bersama token target, jadi otomatis tidak berlaku lagi bila token portal/staff
 * sudah berganti (mis. login biasa).
 */
const STAFF_KEY = 'pmb_impersonasi_staff';
const PORTAL_KEY = { dosen: 'pmb_impersonasi_dosen', mahasiswa: 'pmb_impersonasi_mahasiswa' } as const;
const PORTAL_TOKEN = { dosen: dosenTokenStorage, mahasiswa: mahasiswaTokenStorage } as const;
const PORTAL_HOME = { dosen: '/dosen', mahasiswa: '/mahasiswa/dashboard' } as const;
export type PortalTipe = keyof typeof PORTAL_KEY;

interface StaffBackup {
  adminName: string;
  targetName: string;
  accessToken: string | null;
  refreshToken: string | null;
  context: unknown;
  module: string | null;
  /** Refresh token akun target — penanda sesi impersonasi masih yang sedang aktif. */
  targetRefreshToken: string;
}

interface PortalFlag {
  adminName: string;
  targetName: string;
  token: string;
}

const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const startStaffImpersonasi = async (result: ImpersonasiStaffResult, adminName: string) => {
  const backup: StaffBackup = {
    adminName,
    targetName: result.user.name,
    accessToken: tokenStorage.getAccessToken(),
    refreshToken: tokenStorage.getRefreshToken(),
    context: academicContextStorage.get(),
    module: staffModuleStorage.get(),
    targetRefreshToken: result.refreshToken,
  };
  localStorage.setItem(STAFF_KEY, JSON.stringify(backup));
  tokenStorage.setTokens(result.accessToken, result.refreshToken);
  academicContextStorage.set(result.context);

  // Modul tujuan: Prodi untuk akun prodi, selain itu modul pertama yang bisa diakses akun target.
  const authStore = useAuthStore();
  await authStore.loadProfile();
  const keys = Object.keys(STAFF_MODULES) as StaffModuleKey[];
  const urutan: StaffModuleKey[] = result.context?.prodi ? ['prodi', ...keys.filter((k) => k !== 'prodi')] : keys;
  const module = urutan.find((k) => authStore.permissionsFor(STAFF_MODULES[k].dashboardMenuCode).canRead);
  if (module) staffModuleStorage.set(module);
  else staffModuleStorage.clear();
  // Muat ulang penuh supaya menu, hak akses & cache halaman akun admin tidak terbawa.
  window.location.href = module ? STAFF_MODULES[module].home : '/admin';
};

export const activeStaffImpersonasi = (): StaffBackup | null => {
  const backup = readJson<StaffBackup>(STAFF_KEY);
  if (!backup) return null;
  if (backup.targetRefreshToken !== tokenStorage.getRefreshToken()) return null;
  return backup;
};

export const stopStaffImpersonasi = () => {
  const backup = readJson<StaffBackup>(STAFF_KEY);
  localStorage.removeItem(STAFF_KEY);
  if (backup?.accessToken) {
    tokenStorage.clear();
    tokenStorage.setTokens(backup.accessToken, backup.refreshToken ?? undefined);
    if (backup.context) academicContextStorage.set(backup.context);
    else academicContextStorage.clear();
    if (backup.module) staffModuleStorage.set(backup.module);
    window.location.href = '/modul-admin/impersonasi';
  } else {
    tokenStorage.clear();
    window.location.href = '/admin/login';
  }
};

export const startPortalImpersonasi = (tipe: PortalTipe, token: string, targetName: string, adminName: string) => {
  PORTAL_TOKEN[tipe].set(token);
  const flag: PortalFlag = { adminName, targetName, token };
  localStorage.setItem(PORTAL_KEY[tipe], JSON.stringify(flag));
  window.open(PORTAL_HOME[tipe], '_blank');
};

export const activePortalImpersonasi = (tipe: PortalTipe): PortalFlag | null => {
  const flag = readJson<PortalFlag>(PORTAL_KEY[tipe]);
  if (!flag || flag.token !== PORTAL_TOKEN[tipe].get()) return null;
  return flag;
};

export const stopPortalImpersonasi = (tipe: PortalTipe) => {
  localStorage.removeItem(PORTAL_KEY[tipe]);
  PORTAL_TOKEN[tipe].clear();
  window.close();
  // Tab tidak dibuka lewat script (mis. dibuka manual) tidak bisa ditutup: arahkan ke console admin.
  window.location.href = '/modul-admin/impersonasi';
};
