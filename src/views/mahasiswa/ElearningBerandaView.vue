<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import MahasiswaFeed from '@/components/elearning/MahasiswaFeed.vue';

/**
 * Portal Mahasiswa → E-learning: Beranda (timeline terbaru) & Timeline & Berita (semua) — tampilan sama dengan
 * dosen tanpa panel "Bagikan sesuatu di kelas Anda". Halaman ditentukan dari nama route.
 */
const route = useRoute();
const lengkap = computed(() => route.name === 'mahasiswa-elearning-timeline');
</script>

<template>
  <div>
    <PageHeader
      :title="lengkap ? 'Timeline & Berita' : 'E-learning'"
      :subtitle="lengkap ? 'Semua aktivitas kelas Anda dan berita kampus.' : 'Materi, video, kuis, dan tugas dari dosen di kelas Anda.'"
    />
    <ElearningShell portal="mahasiswa">
      <MahasiswaFeed :batas="lengkap ? null : 15" />
    </ElearningShell>
  </div>
</template>
