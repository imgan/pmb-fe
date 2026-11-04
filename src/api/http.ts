import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'pmb_access_token';
const REFRESH_KEY = 'pmb_refresh_token';

/** Kunci localStorage token staff (dipakai juga untuk sinkron antar tab, lihat stores/auth.ts). */
export const STAFF_TOKEN_KEY = TOKEN_KEY;

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Modul staff terakhir yang dipilih saat login (pmb/baak/keuangan/...). */
const MODULE_KEY = 'pmb_staff_module';
export const staffModuleStorage = {
  get: () => localStorage.getItem(MODULE_KEY),
  set: (module: string) => localStorage.setItem(MODULE_KEY, module),
  clear: () => localStorage.removeItem(MODULE_KEY),
};

/** Konteks akademik sesi (lihat stores/auth.ts); disimpan di sini supaya interceptor bisa membacanya. */
const CONTEXT_KEY = 'pmb_academic_context';
export const academicContextStorage = {
  get: <T>(): T | null => {
    try {
      const raw = localStorage.getItem(CONTEXT_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set: (value: unknown) => localStorage.setItem(CONTEXT_KEY, JSON.stringify(value)),
  clear: () => localStorage.removeItem(CONTEXT_KEY),
};

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  // Tahun akademik acuan & prodi sesi; X-Kode-Prodi dipakai backend untuk membatasi data /prodi/*.
  const context = academicContextStorage.get<{ tahunAkademik?: { id: number } | null; prodi?: { kodeProdi: string } | null }>();
  if (context?.tahunAkademik) config.headers.set('X-Tahun-Ajaran-Id', String(context.tahunAkademik.id));
  if (context?.prodi) config.headers.set('X-Kode-Prodi', context.prodi.kodeProdi);
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const registerUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });
    // Sesi sudah berganti (login akun/modul lain) selagi refresh berjalan: jangan timpa token sesi
    // baru dengan token akun lama — pakai token yang sekarang tersimpan.
    if (tokenStorage.getRefreshToken() !== refreshToken) return tokenStorage.getAccessToken();
    const newAccessToken: string = response.data.data.accessToken;
    tokenStorage.setTokens(newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
};

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh-token'];
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      // Request dari sesi lama (token sudah diganti login baru): ulangi saja dengan token sekarang,
      // jangan refresh/hapus token sesi baru.
      const sentToken = String(originalRequest.headers.get('Authorization') ?? '').replace(/^Bearer\s+/, '');
      const currentToken = tokenStorage.getAccessToken();
      if (currentToken && sentToken && sentToken !== currentToken) {
        originalRequest.headers.set('Authorization', `Bearer ${currentToken}`);
        return http(originalRequest);
      }

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return http(originalRequest);
      }

      tokenStorage.clear();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

export interface ApiErrorPayload {
  success: false;
  message: string;
}

export const extractErrorMessage = (error: unknown, fallback = 'Terjadi kesalahan, silakan coba lagi'): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.message) return payload.message;
  }
  return fallback;
};
