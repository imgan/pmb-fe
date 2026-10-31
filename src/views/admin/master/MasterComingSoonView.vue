<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ComingSoonPanel from '@/components/layout/ComingSoonPanel.vue';

// Halaman sementara untuk sub menu Master (Modul Admin) yang CRUD-nya belum dibuat.
const route = useRoute();
const title = computed(() => `Master ${(route.meta.title as string | undefined) ?? ''}`.trim());
</script>

<template>
  <div>
    <PageHeader :title="title" />
    <ComingSoonPanel icon="database" message="Menu master ini sedang dalam pengembangan dan akan segera hadir." />
  </div>
</template>
