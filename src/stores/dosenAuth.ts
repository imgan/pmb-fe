import { defineStore } from 'pinia';
import { dosenAuthApi, type DosenLoginPayload } from '@/api/dosenAuth';
import { dosenTokenStorage } from '@/api/dosenHttp';
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
    },

    logout() {
      dosenTokenStorage.clear();
      this.dosen = null;
    },
  },
});
