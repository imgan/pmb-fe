<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// Halaman sementara untuk sub-menu Pengajuan yang alurnya belum dibuat (Cuti, Judul Skripsi/TA,
// Kuliah Kerja Praktek, Sidang). Judul diambil dari meta.title route.
const route = useRoute();
const title = computed(() => route.meta.title ?? 'Pengajuan');
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">{{ title }}</h1>
    </header>
    <div class="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-lg">
      <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 40px">construction</span>
      <p class="mt-2 text-body-md text-on-surface">Fitur pengajuan ini segera tersedia.</p>
      <p class="text-body-sm text-on-surface-variant">Untuk sementara silakan hubungi BAAK.</p>
    </div>
  </div>
</template>
