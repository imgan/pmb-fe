<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { extractErrorMessage } from '@/api/http';
import { mahasiswaNilaiApi, type MatakuliahMengulang } from '@/api/mahasiswaPortal';

const mahasiswaAuthStore = useMahasiswaAuthStore();
const loading = ref(true);
const error = ref<string | null>(null);

// Mata kuliah yang belum selesai (nilai di bawah C) — gagal dimuat (mis. akses nilai dibatasi
// tagihan) cukup ditandai, tidak mengganggu biodata.
const mengulang = ref<MatakuliahMengulang[]>([]);
const mengulangError = ref<string | null>(null);
const loadMengulang = async () => {
  try {
    mengulang.value = await mahasiswaNilaiApi.mengulang();
  } catch (err) {
    mengulangError.value = extractErrorMessage(err, 'Gagal memuat mata kuliah mengulang');
  }
};

onMounted(async () => {
  loadMengulang();
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

    <section v-if="!loading" class="mt-6 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Mata Kuliah Belum Selesai (Mengulang)</div>
      <div v-if="mengulangError" class="p-4 text-body-sm text-on-surface-variant">{{ mengulangError }}</div>
      <div v-else-if="!mengulang.length" class="p-4 text-body-sm text-on-surface-variant">
        Tidak ada mata kuliah yang harus diulang.
      </div>
      <template v-else>
        <p class="px-4 pt-4 text-body-sm text-on-surface-variant">
          Mata kuliah dengan nilai di bawah C harus diulang. Kelasnya tetap bisa dipilih di KRS walau beda semester.
        </p>
        <div class="p-4 overflow-x-auto">
          <table class="w-full text-body-sm">
            <thead>
              <tr class="text-left text-on-surface-variant border-b border-outline-variant">
                <th class="py-2 pr-3 font-medium">Kode</th>
                <th class="py-2 pr-3 font-medium">Mata Kuliah</th>
                <th class="py-2 pr-3 font-medium text-center">SKS</th>
                <th class="py-2 pr-3 font-medium text-center">Smt</th>
                <th class="py-2 pr-3 font-medium text-center">Nilai</th>
                <th class="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mk in mengulang" :key="mk.kodeMataKuliah" class="border-b border-outline-variant last:border-0">
                <td class="py-2 pr-3 text-on-surface">{{ mk.kodeMataKuliah }}</td>
                <td class="py-2 pr-3 text-on-surface">{{ mk.namaMataKuliah }}</td>
                <td class="py-2 pr-3 text-center">{{ mk.sks }}</td>
                <td class="py-2 pr-3 text-center">{{ mk.semester }}</td>
                <td class="py-2 pr-3 text-center font-semibold text-error">{{ mk.grade }}</td>
                <td class="py-2">
                  <span
                    class="px-2 py-0.5 rounded-full text-label-sm"
                    :class="mk.sedangDiulang ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'"
                  >
                    {{ mk.sedangDiulang ? 'Sedang diulang' : 'Belum diambil' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>
