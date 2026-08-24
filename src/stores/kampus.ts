import { defineStore } from 'pinia';
import { publicApi } from '@/api/public';
import type { Kampus } from '@/types/entities';

interface KampusState {
  kampus: Kampus | null;
  loaded: boolean;
}

export const useKampusStore = defineStore('kampus', {
  state: (): KampusState => ({
    kampus: null,
    loaded: false,
  }),

  actions: {
    async load() {
      if (this.loaded) return;
      try {
        this.kampus = await publicApi.kampus();
      } finally {
        this.loaded = true;
      }
    },
  },
});
