<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import WhatsappFab from '@/components/public/WhatsappFab.vue';
import ImpersonasiBanner from '@/components/layout/ImpersonasiBanner.vue';
import { useKampusStore } from '@/stores/kampus';

const route = useRoute();
const kampusStore = useKampusStore();

watch(
  () => kampusStore.kampus?.faviconUrl,
  (faviconUrl) => {
    if (!faviconUrl) return;
    const link = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (link) link.href = faviconUrl;
  }
);

/** Judul aplikasi (tab browser) untuk semua halaman sistem: login & portal admin, BAAK, prodi, dosen, mahasiswa, dst. */
const JUDUL_APLIKASI = 'SMART - Sistem Manajemen Akademik Terintegrasi';
/** Halaman website publik PMB — judulnya mengikuti Master Kampus → "Website Title". */
const halamanPublik = (path: string) =>
  path === '/' || ['/pendaftaran', '/beasiswa/', '/biaya-kuliah/', '/informasi/'].some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`));

watch(
  [() => kampusStore.kampus?.websiteTitle, () => route.path],
  ([websiteTitle, path]) => {
    document.title = halamanPublik(path) && websiteTitle ? websiteTitle : JUDUL_APLIKASI;
  },
  { immediate: true }
);

onMounted(() => {
  kampusStore.load();
});
</script>

<template>
  <RouterView />
  <ImpersonasiBanner />
  <WhatsappFab v-if="route.path === '/' || route.path.startsWith('/pendaftaran')" />
</template>
