import axios, { type InternalAxiosRequestConfig } from 'axios';

// Portal Mahasiswa punya token terpisah dari admin (pmb_access_token), peserta
// (pmb_peserta_access_token), dan dosen (pmb_dosen_access_token) supaya semuanya bisa login
// berbarengan di browser yang sama tanpa saling menimpa sesi.
const TOKEN_KEY = 'pmb_mahasiswa_access_token';

export const mahasiswaTokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const mahasiswaHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

mahasiswaHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = mahasiswaTokenStorage.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const registerMahasiswaUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

mahasiswaHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = !!error.config?.url?.includes('/mahasiswa-portal/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      mahasiswaTokenStorage.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);
