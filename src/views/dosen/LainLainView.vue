<script setup lang="ts">
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';

/** Halaman induk Lain-Lain: daftar fitur tambahan portal dosen (sama dengan isi dropdown Lain-Lain). */
const FITUR = [
  {
    name: 'dosen-referensi-judul',
    icon: 'library_books',
    label: 'Referensi Judul',
    keterangan: 'Judul TA/Skripsi yang diajukan mahasiswa (disetujui prodi) per prodi & periode.',
  },
  {
    name: 'dosen-kesediaan-mengajar',
    icon: 'event_available',
    label: 'Kesediaan Mengajar',
    keterangan: 'Matakuliah & jam bersedia mengajar per hari, bahan ploting jadwal periode berikutnya.',
  },
  {
    name: 'dosen-mahasiswa-pa',
    icon: 'supervisor_account',
    label: 'Mahasiswa Bimbingan Akademik',
    keterangan: 'Mahasiswa yang Anda bimbing sebagai dosen PA: kontak, IPK, KRS, KHS, dan biodata.',
  },
];
</script>

<template>
  <div>
    <PageHeader title="Lain-Lain" subtitle="Dosen / Lain-Lain" />
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="f in FITUR"
        :key="f.name"
        :to="{ name: f.name }"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 flex items-start gap-4 hover:border-primary transition-colors"
      >
        <span class="material-symbols-outlined text-primary" style="font-size: 32px">{{ f.icon }}</span>
        <span>
          <span class="block font-semibold text-title-md text-on-surface">{{ f.label }}</span>
          <span class="block text-body-sm text-on-surface-variant mt-1">{{ f.keterangan }}</span>
        </span>
      </RouterLink>
    </div>
  </div>
</template>
