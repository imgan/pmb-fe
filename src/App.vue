<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import WhatsappFab from '@/components/public/WhatsappFab.vue';
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

watch(
  [() => kampusStore.kampus?.websiteTitle, () => route.path],
  ([websiteTitle, path]) => {
    if (!websiteTitle || path.startsWith('/admin')) return;
    document.title = websiteTitle;
  },
  { immediate: true }
);

onMounted(() => {
  kampusStore.load();
});
</script>

<template>
  <RouterView />
  <WhatsappFab v-if="!route.path.startsWith('/admin')" />
</template>
