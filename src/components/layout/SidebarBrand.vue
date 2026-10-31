<script setup lang="ts">
import { useKampusStore } from '@/stores/kampus';

/**
 * Header logo di sidebar setiap modul staf: pita warna primary selebar sidebar berisi logo kampus
 * (master Kampus, endpoint publik) + badge nama modul. Dipasang sebagai anak pertama <aside class="p-4">.
 */
defineProps<{ label: string; icon: string }>();
defineEmits<{ close: [] }>();

const kampusStore = useKampusStore();
kampusStore.load();
</script>

<template>
  <div class="-mx-4 -mt-4 mb-6 px-4 py-4 bg-primary text-on-primary flex items-center justify-between shadow-sm">
    <!-- Logo kampus sudah memuat nama kampus; teks nama hanya tampil bila logo belum diisi. -->
    <div class="min-w-0 flex-1">
      <img
        v-if="kampusStore.kampus?.logoUrl"
        :src="kampusStore.kampus.logoUrl"
        :alt="kampusStore.kampus.namaKampus || 'Logo kampus'"
        class="h-12 w-auto max-w-full object-contain"
      />
      <h2 v-else class="font-semibold text-headline-md truncate">{{ kampusStore.kampus?.namaKampus || 'Politeknik Bhakti Kartini' }}</h2>
      <p class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 text-primary text-label-sm font-semibold">
        <span class="material-symbols-outlined" style="font-size: 16px">{{ icon }}</span>
        {{ label }}
      </p>
    </div>
    <button type="button" class="md:hidden text-on-primary" @click="$emit('close')">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
</template>
