<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { extractErrorMessage } from '@/api/http';

const mahasiswaAuthStore = useMahasiswaAuthStore();
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    await mahasiswaAuthStore.loadProfile();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat profil');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Dashboard</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Ringkasan profil akademik Anda.</p>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section v-else-if="mahasiswaAuthStore.mahasiswa" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Biodata Mahasiswa</div>
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-body-md">
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">NIM</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.nim }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">Nama Lengkap</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.namaLengkap }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">Email</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.email }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">No. Telepon</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.noTelepon ?? '-' }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">Program Studi</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.jurusan?.namaJurusan ?? '-' }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">Kelas</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.golonganKelas?.namaKelas ?? '-' }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">Tahun Masuk</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.tahunMasuk }}</span>
        </div>
        <div class="grid grid-cols-[140px_1fr] gap-x-2">
          <span class="text-on-surface-variant">Status</span>
          <span class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa.isActive ? 'Aktif' : 'Non-aktif' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
