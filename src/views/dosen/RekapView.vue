<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import RekapMahasiswaView from './RekapMahasiswaView.vue';
import RekapRealisasiView from './RekapRealisasiView.vue';

/**
 * Menu Harian → Rekap: gabungan Rekap Mahasiswa (kehadiran peserta per kelas) dan Rekap Realisasi
 * (realisasi mengajar per kelas) dalam satu halaman bertab. Tab aktif disimpan di query `?tab=`.
 */
const TABS = [
  { key: 'mahasiswa', label: 'Rekap Mahasiswa', icon: 'groups' },
  { key: 'realisasi', label: 'Rekap Realisasi', icon: 'fact_check' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const route = useRoute();
const router = useRouter();
const tab = computed<TabKey>(() => (route.query.tab === 'realisasi' ? 'realisasi' : 'mahasiswa'));
const pilih = (key: TabKey) => router.replace({ query: { ...route.query, tab: key } });
</script>

<template>
  <div>
    <PageHeader title="Rekap Mahasiswa" subtitle="Dosen / Laporan / Rekap Mahasiswa" />

    <div class="flex gap-1 border-b border-outline-variant mb-6" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="tab === t.key"
        class="inline-flex items-center gap-2 px-4 py-2 text-label-md font-medium rounded-t-md -mb-px border"
        :class="tab === t.key ? 'bg-primary text-on-primary border-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container'"
        @click="pilih(t.key)"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">{{ t.icon }}</span>
        {{ t.label }}
      </button>
    </div>

    <KeepAlive>
      <RekapMahasiswaView v-if="tab === 'mahasiswa'" embedded />
      <RekapRealisasiView v-else embedded />
    </KeepAlive>
  </div>
</template>
