<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ComingSoonPanel from '@/components/layout/ComingSoonPanel.vue';

// Halaman sementara untuk sub menu Prodi → Perkuliahan yang fiturnya belum dibuat.
const route = useRoute();
const title = computed(() => (route.meta.title as string | undefined) ?? 'Perkuliahan');
const subtitle = computed(() => route.meta.subtitle as string | undefined);
const icon = computed(() => (route.meta.icon as string | undefined) ?? 'local_library');
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle" />
    <ComingSoonPanel :icon="icon" message="Menu ini sedang dalam pengembangan dan akan segera hadir." />
  </div>
</template>
