import { defineStore } from 'pinia';
import { dosenAuthApi, type DosenLoginPayload } from '@/api/dosenAuth';
import { dosenTahunAkademikStorage, dosenTokenStorage } from '@/api/dosenHttp';
import { RINGKASAN_DOSEN_KEY } from '@/api/elearning';
import type { Dosen } from '@/types/entities';

interface DosenAuthState {
  dosen: Dosen | null;
  ready: boolean;
}

export const useDosenAuthStore = defineStore('dosenAuth', {
  state: (): DosenAuthState => ({
    dosen: null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.dosen,
  },

  actions: {
    async loadProfile() {
      this.dosen = await dosenAuthApi.me();
    },

    async bootstrap() {
      if (dosenTokenStorage.get()) {
        try {
          await this.loadProfile();
        } catch {
          dosenTokenStorage.clear();
          this.dosen = null;
        }
      }
      this.ready = true;
    },

    async login(payload: DosenLoginPayload) {
      const result = await dosenAuthApi.login(payload);
      dosenTokenStorage.set(result.accessToken);
      this.dosen = result.dosen;
      // Data login tidak memuat foto profil; muat ulang profil lengkap di belakang.
      this.loadProfile().catch(() => undefined);
      // Popup "Ringkasan Minggu Ini" tampil sekali setelah login (dibaca DosenLayout).
      try {
        sessionStorage.setItem(RINGKASAN_DOSEN_KEY, '1');
      } catch {
        // penyimpanan sesi tidak tersedia — popup dilewati.
      }
    },

    setDosen(dosen: Dosen) {
      this.dosen = dosen;
    },

    logout() {
      dosenTokenStorage.clear();
      dosenTahunAkademikStorage.set(null);
      this.dosen = null;
    },
  },
});
