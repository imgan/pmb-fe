<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ComingSoonPanel from '@/components/layout/ComingSoonPanel.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';

/** Menu E-learning yang belum dibangun (Obrolan, Jelajah) — judul, keterangan & ikon dari route meta. */
const route = useRoute();
const title = computed(() => (route.meta.title as string | undefined) ?? 'E-learning');
const subtitle = computed(() => route.meta.subtitle as string | undefined);
const icon = computed(() => (route.meta.icon as string | undefined) ?? 'construction');
const pesan = computed(() => (route.meta.pesan as string | undefined) ?? 'Menu ini sedang dalam pengembangan dan akan segera hadir.');
const portal = route.meta.portal === 'mahasiswa' ? 'mahasiswa' : 'dosen';
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle" />
    <ElearningShell :portal="portal">
      <ComingSoonPanel :icon="icon" :message="pesan" />
    </ElearningShell>
  </div>
</template>
