import { defineStore } from 'pinia';
import { pesertaAuthApi } from '@/api/pesertaAuth';
import { pesertaTokenStorage } from '@/api/pesertaHttp';
import type { Peserta, PesertaDokumenStatus } from '@/types/entities';

interface PesertaAuthState {
  peserta: Peserta | null;
  ready: boolean;
  /** Progres untuk centang hijau di menu kiri peserta (null = belum dimuat). */
  dokumen: PesertaDokumenStatus[] | null;
  dataPmbTersimpan: boolean | null;
}

export const usePesertaAuthStore = defineStore('pesertaAuth', {
  state: (): PesertaAuthState => ({
    peserta: null,
    ready: false,
    dokumen: null,
    dataPmbTersimpan: null,
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

    async login(username: string, password: string) {
      const result = await pesertaAuthApi.login(username, password);
      pesertaTokenStorage.set(result.accessToken);
      this.peserta = result.peserta;
    },

    async refreshProfile() {
      await this.loadProfile();
    },

    /** Muat status dokumen & data pendaftaran (dipanggil menu kiri; halaman terkait memperbarui sendiri setelah simpan). */
    async loadProgress() {
      const [dokumen, dataPmb] = await Promise.allSettled([pesertaAuthApi.listMyDokumen(), pesertaAuthApi.getMyDataPmb()]);
      if (dokumen.status === 'fulfilled') this.dokumen = dokumen.value;
      if (dataPmb.status === 'fulfilled') this.dataPmbTersimpan = dataPmb.value.tersimpan;
    },

    logout() {
      pesertaTokenStorage.clear();
      this.peserta = null;
      this.dokumen = null;
      this.dataPmbTersimpan = null;
    },
  },
});
