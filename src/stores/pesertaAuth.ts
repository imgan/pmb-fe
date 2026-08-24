import { defineStore } from 'pinia';
import { pesertaAuthApi } from '@/api/pesertaAuth';
import { pesertaTokenStorage } from '@/api/pesertaHttp';
import type { Peserta } from '@/types/entities';

interface PesertaAuthState {
  peserta: Peserta | null;
  ready: boolean;
}

export const usePesertaAuthStore = defineStore('pesertaAuth', {
  state: (): PesertaAuthState => ({
    peserta: null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.peserta,
  },

  actions: {
    async loadProfile() {
      this.peserta = await pesertaAuthApi.me();
    },

    async bootstrap() {
      if (pesertaTokenStorage.get()) {
        try {
          await this.loadProfile();
        } catch {
          pesertaTokenStorage.clear();
          this.peserta = null;
        }
      }
      this.ready = true;
    },

    async register(payload: Parameters<typeof pesertaAuthApi.register>[0]) {
      return pesertaAuthApi.register(payload);
    },

    async login(email: string, password: string) {
      const result = await pesertaAuthApi.login(email, password);
      pesertaTokenStorage.set(result.accessToken);
      this.peserta = result.peserta;
    },

    async refreshProfile() {
      await this.loadProfile();
    },

    logout() {
      pesertaTokenStorage.clear();
      this.peserta = null;
    },
  },
});
