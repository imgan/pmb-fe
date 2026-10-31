<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import { mahasiswaElearningApi, type KelasMahasiswaElearning } from '@/api/elearning';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { extractErrorMessage } from '@/api/http';

/**
 * Portal Mahasiswa → E-learning → My Class: kelas yang diikuti (KRS disetujui, tahun ajaran aktif) beserta
 * dosen & progres konten (selesai / jumlah). Klik kartu → halaman kelas (materi, video, kuis, tugas).
 */
const kelas = ref<KelasMahasiswaElearning[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
onMounted(async () => {
  loading.value = true;
  try {
    kelas.value = await mahasiswaElearningApi.kelas();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  } finally {
    loading.value = false;
  }
});
const persen = (k: KelasMahasiswaElearning) => (k.jumlah ? Math.round((k.selesai / k.jumlah) * 100) : 0);
</script>

<template>
  <div>
    <PageHeader title="My Class" subtitle="Kelas yang Anda ikuti semester ini." />
    <ElearningShell portal="mahasiswa">
      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else-if="!kelas.length" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
        Belum ada kelas — KRS Anda pada tahun akademik aktif belum disetujui.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        <RouterLink
          v-for="k in kelas"
          :key="k.id"
          :to="{ name: 'mahasiswa-elearning-kelas', params: { id: k.id } }"
          class="group rounded-xl border border-outline-variant bg-surface-container-lowest p-4 hover:border-primary hover:shadow-sm transition flex flex-col gap-3"
        >
          <div class="flex items-start gap-3">
            <MataKuliahIlustrasi :nama="k.namaMataKuliah" :kode="k.kodeMataKuliah" :ikon="k.ikon" />
            <div class="min-w-0">
              <p class="font-semibold text-on-surface leading-snug">{{ k.namaMataKuliah }}</p>
              <p class="text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.sks ?? 0 }} SKS</p>
              <p class="text-label-sm text-on-surface-variant truncate">{{ k.dosen ?? 'Dosen belum ditentukan' }}</p>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-label-sm text-on-surface-variant mb-1">
              <span>{{ k.jumlah ? `${k.selesai} dari ${k.jumlah} konten selesai` : 'Belum ada konten' }}</span>
              <span v-if="k.jumlah" class="font-semibold text-on-surface">{{ persen(k) }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div class="h-full rounded-full bg-primary" :style="{ width: `${persen(k)}%` }" />
            </div>
          </div>
        </RouterLink>
      </div>
    </ElearningShell>
  </div>
</template>
