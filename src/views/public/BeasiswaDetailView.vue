<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import { publicApi } from '@/api/public';
import { extractErrorMessage } from '@/api/http';
import type { Beasiswa } from '@/types/entities';

const props = defineProps<{ slug: string }>();

const beasiswa = ref<Beasiswa | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  beasiswa.value = null;
  try {
    beasiswa.value = await publicApi.beasiswaDetail(props.slug);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Halaman beasiswa tidak ditemukan');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(() => props.slug, load);
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <main class="flex-1 w-full max-w-3xl mx-auto px-4 md:px-12 py-12 md:py-16">
      <RouterLink to="/" class="inline-flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-primary transition-colors mb-6">
        <span class="material-symbols-outlined" style="font-size: 16px">arrow_back</span>
        Kembali ke Beranda
      </RouterLink>

      <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat halaman...</div>

      <div v-else-if="error" class="text-center py-16">
        <span class="material-symbols-outlined text-error" style="font-size: 48px">error</span>
        <p class="mt-4 text-body-md text-on-surface-variant">{{ error }}</p>
      </div>

      <template v-else-if="beasiswa">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-bold text-primary mb-3">{{ beasiswa.namaBeasiswa }}</h1>
        <p v-if="beasiswa.ringkasan" class="text-body-lg text-on-surface-variant mb-8">{{ beasiswa.ringkasan }}</p>

        <div class="beasiswa-content" v-html="beasiswa.konten"></div>
      </template>
    </main>

    <PublicFooter />
  </div>
</template>

<style scoped>
.beasiswa-content :deep(h2) {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 700;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  margin: 2rem 0 1rem;
}
.beasiswa-content :deep(h2:first-child) {
  margin-top: 0;
}
.beasiswa-content :deep(p) {
  color: var(--color-on-surface);
  line-height: 1.7;
  margin-bottom: 1rem;
}
.beasiswa-content :deep(ol),
.beasiswa-content :deep(ul) {
  margin: 0 0 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.beasiswa-content :deep(ol) {
  list-style: decimal;
}
.beasiswa-content :deep(ul) {
  list-style: disc;
}
.beasiswa-content :deep(li) {
  color: var(--color-on-surface);
  line-height: 1.7;
  padding-left: 0.25rem;
}
.beasiswa-content :deep(a) {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: underline;
}
.beasiswa-content :deep(strong) {
  font-weight: 700;
}
</style>
