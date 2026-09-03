import { defineStore } from 'pinia';
import { mahasiswaAuthApi, type MahasiswaLoginPayload } from '@/api/mahasiswaAuth';
import { mahasiswaTokenStorage } from '@/api/mahasiswaHttp';
import type { Mahasiswa } from '@/types/entities';

interface MahasiswaAuthState {
  mahasiswa: Mahasiswa | null;
  ready: boolean;
}

export const useMahasiswaAuthStore = defineStore('mahasiswaAuth', {
  state: (): MahasiswaAuthState => ({
    mahasiswa: null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.mahasiswa,
  },

  actions: {
    setMahasiswa(mahasiswa: Mahasiswa) {
      this.mahasiswa = mahasiswa;
    },

    async loadProfile() {
      this.mahasiswa = await mahasiswaAuthApi.me();
    },

    async bootstrap() {
      if (mahasiswaTokenStorage.get()) {
        try {
          await this.loadProfile();
        } catch {
          mahasiswaTokenStorage.clear();
          this.mahasiswa = null;
        }
      }
      this.ready = true;
    },

    async login(payload: MahasiswaLoginPayload) {
      const result = await mahasiswaAuthApi.login(payload);
      mahasiswaTokenStorage.set(result.accessToken);
      this.mahasiswa = result.mahasiswa;
    },

    logout() {
      mahasiswaTokenStorage.clear();
      this.mahasiswa = null;
    },
  },
});
