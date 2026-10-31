<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
import JadwalUjianPanel from '@/components/jadwal/JadwalUjianPanel.vue';
import { dosenJadwalUjianApi } from '@/api/jadwalUjian';

/**
 * Portal Dosen → Jadwal Ujian: kelas yang diampu (jadwal kuliah dari BAAK); dosen mengisi sendiri
 * Status, Sifat & Tanggal Ujian. Periode mengikuti Setting Tahun Akademik di menu profil.
 */
</script>

<template>
  <div>
    <PageHeader title="Jadwal Ujian" subtitle="Dosen / Perkuliahan / Jadwal Ujian" />
    <JadwalUjianPanel :api="dosenJadwalUjianApi" />
  </div>
</template>
