<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { obrolanApi } from '@/api/elearningSosial';

/**
 * Kerangka halaman E-learning (dosen & mahasiswa): menu samping (Beranda, My Class, Timeline & Berita, Obrolan, Jelajah) di kiri dan isi halaman
 * di kanan. Di layar kecil menu tampil horizontal di atas.
 */
// portal: 'dosen' (default) / 'mahasiswa' — nama route berawalan portal (mis. mahasiswa-elearning-myclass).
const props = withDefaults(defineProps<{ portal?: 'dosen' | 'mahasiswa' }>(), { portal: 'dosen' });
const route = useRoute();
const MENU = computed(() => {
  const p = props.portal;
  return [
    { name: `${p}-elearning`, label: 'Beranda', icon: 'home', aktifUntuk: [`${p}-elearning`] },
    { name: `${p}-elearning-myclass`, label: 'My Class', icon: 'school', aktifUntuk: [`${p}-elearning-myclass`, `${p}-elearning-kelas`] },
    // Tugas / konten grup — khusus mahasiswa.
    ...(p === 'mahasiswa' ? [{ name: 'mahasiswa-elearning-myteam', label: 'My Team', icon: 'groups', aktifUntuk: ['mahasiswa-elearning-myteam'] }] : []),
    { name: `${p}-elearning-timeline`, label: 'Timeline & Berita', icon: 'newspaper', aktifUntuk: [`${p}-elearning-timeline`] },
    { name: `${p}-elearning-obrolan`, label: 'Obrolan', icon: 'forum', aktifUntuk: [`${p}-elearning-obrolan`] },
    { name: `${p}-elearning-jelajah`, label: 'Jelajah', icon: 'rocket_launch', aktifUntuk: [`${p}-elearning-jelajah`] },
    // Rekap & unduh laporan tugas — khusus dosen.
    ...(p === 'dosen'
      ? [{ name: 'dosen-elearning-laporan-tugas', label: 'Laporan Tugas', icon: 'download', aktifUntuk: ['dosen-elearning-laporan-tugas'] }]
      : []),
    // Riwayat belajar semester lampau — khusus mahasiswa.
    ...(p === 'mahasiswa'
      ? [{ name: 'mahasiswa-elearning-history', label: 'Learning History', icon: 'history', aktifUntuk: ['mahasiswa-elearning-history'] }]
      : []),
  ];
});
const aktif = computed(() => String(route.name ?? ''));

// Badge pesan obrolan belum dibaca (diperbarui berkala selama halaman e-learning terbuka & terlihat).
const belumDibaca = ref(0);
const muatBelum = async () => {
  try {
    belumDibaca.value = await obrolanApi[props.portal].belumDibaca();
  } catch {
    /* badge opsional: abaikan galat */
  }
};
let timerBelum: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  muatBelum();
  timerBelum = setInterval(() => document.visibilityState === 'visible' && muatBelum(), 30_000);
});
onBeforeUnmount(() => clearInterval(timerBelum));
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6 items-start">
    <nav class="w-full lg:w-56 shrink-0 lg:sticky lg:top-36" aria-label="Menu E-learning">
      <div class="flex lg:flex-col gap-1 overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-2">
        <RouterLink
          v-for="m in MENU"
          :key="m.name"
          :to="{ name: m.name }"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md whitespace-nowrap transition-colors"
          :class="m.aktifUntuk.includes(aktif) ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface hover:bg-surface-container'"
        >
          <span class="material-symbols-outlined" style="font-size: 20px">{{ m.icon }}</span>
          {{ m.label }}
          <span
            v-if="m.name.endsWith('-elearning-obrolan') && belumDibaca"
            class="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-error text-on-error text-[11px] leading-5 text-center font-semibold"
            :title="`${belumDibaca} pesan belum dibaca`"
          >
            {{ belumDibaca > 99 ? '99+' : belumDibaca }}
          </span>
        </RouterLink>
      </div>
    </nav>
    <div class="flex-1 min-w-0 w-full">
      <slot />
    </div>
  </div>
</template>
