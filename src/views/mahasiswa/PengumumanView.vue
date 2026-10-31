<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { mahasiswaPengumumanApi, type PengumumanMahasiswa } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';

const items = ref<PengumumanMahasiswa[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    items.value = await mahasiswaPengumumanApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pengumuman');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Pengumuman</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Informasi perkuliahan dari BAAK.</p>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat pengumuman...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div
      v-else-if="!items.length"
      class="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center text-body-md text-on-surface-variant"
    >
      Belum ada pengumuman.
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="p in items"
        :key="p.id"
        class="bg-surface-container-lowest border rounded-lg overflow-hidden"
        :class="p.isPenting ? 'border-error' : 'border-outline-variant'"
      >
        <div class="px-4 py-3 border-b border-outline-variant flex flex-wrap items-center gap-x-3 gap-y-1">
          <span v-if="p.isPenting" class="px-2 py-0.5 rounded-full text-label-sm bg-error-container text-on-error-container">Penting</span>
          <h2 class="font-semibold text-title-md text-on-surface flex-1 min-w-0">{{ p.judul }}</h2>
          <span class="text-label-sm text-on-surface-variant whitespace-nowrap">
            {{ formatDate(p.tanggalTerbit) }}<template v-if="p.jurusan"> · {{ p.jurusan.namaJurusan }}</template>
          </span>
        </div>
        <!-- Isi dari editor BAAK; tag berbahaya sudah dibuang di server (pengumuman.service). -->
        <div class="pengumuman-isi p-4 text-body-md text-on-surface" v-html="p.isi"></div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.pengumuman-isi :deep(p) {
  margin-bottom: 0.5rem;
}
.pengumuman-isi :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.pengumuman-isi :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.pengumuman-isi :deep(a) {
  color: var(--color-primary, #8b6f2f);
  text-decoration: underline;
}
.pengumuman-isi :deep(h2),
.pengumuman-isi :deep(h3) {
  font-weight: 600;
  margin: 0.75rem 0 0.25rem;
}
</style>
