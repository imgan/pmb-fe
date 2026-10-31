<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';

/** Menu akun peserta (dulu dropdown "Halo, ..." di header) — tampil di sisi kiri halaman Status / Biodata / Dokumen. */
const pesertaAuthStore = usePesertaAuthStore();
const router = useRouter();

// Lengkap = semua dokumen jenis tsb sudah diupload (jenis yang belum ada di master tidak diberi centang).
const dokumenLengkap = (beasiswa: boolean) => {
  const daftar = (pesertaAuthStore.dokumen ?? []).filter((d) => d.isBeasiswa === beasiswa);
  return daftar.length > 0 && daftar.every((d) => d.upload);
};

/** done = centang hijau di sebelah kanan menu. */
const menus = computed(() => [
  { to: '/pendaftaran/status', icon: 'timeline', label: 'Status Pendaftaran', done: pesertaAuthStore.peserta?.statusKelulusan === 'diterima' },
  { to: '/pendaftaran/biodata', icon: 'person', label: 'Biodata Saya', done: !!pesertaAuthStore.peserta?.biodata },
  { to: '/pendaftaran/data-pendaftaran', icon: 'fact_check', label: 'Data Pendaftaran', done: !!pesertaAuthStore.dataPmbTersimpan },
  { to: '/pendaftaran/dokumen', icon: 'upload_file', label: 'Dokumen Pendaftaran', done: dokumenLengkap(false) },
  { to: '/pendaftaran/dokumen-beasiswa', icon: 'workspace_premium', label: 'Dokumen Beasiswa', done: dokumenLengkap(true) },
  { to: '/pendaftaran/tes-ujian', icon: 'quiz', label: 'Tes Ujian', done: pesertaAuthStore.peserta?.statusUjian === 'lulus' },
]);

onMounted(() => pesertaAuthStore.loadProgress());

const handleLogout = () => {
  pesertaAuthStore.logout();
  router.push('/');
};
</script>

<template>
  <aside class="w-full md:sticky md:top-24">
    <nav class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm py-2">
      <p class="px-4 pt-2 pb-3 mb-1 border-b border-outline-variant text-label-md font-semibold text-on-surface truncate">
        {{ pesertaAuthStore.peserta?.namaLengkap }}
      </p>
      <RouterLink
        v-for="m in menus"
        :key="m.to"
        :to="m.to"
        class="flex items-center gap-2 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
        active-class="bg-primary-container/40 text-primary font-semibold"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">{{ m.icon }}</span>
        <span class="flex-1 min-w-0 truncate">{{ m.label }}</span>
        <span v-if="m.done" class="material-symbols-outlined text-success" style="font-size: 18px" title="Sudah lengkap">check_circle</span>
      </RouterLink>
      <button
        type="button"
        class="w-full flex items-center gap-2 px-4 py-2.5 mt-1 border-t border-outline-variant text-body-sm text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
        @click="handleLogout"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">logout</span>
        Keluar
      </button>
    </nav>
  </aside>
</template>
