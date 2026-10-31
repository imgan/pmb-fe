<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { mahasiswaDataKampusApi, type KartuBimbingan } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate, formatDateTime } from '@/utils/format';

/** Kartu bimbingan TA/Skripsi: catatan konsultasi yang diinput dosen pembimbing. */
const data = ref<KartuBimbingan | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    data.value = await mahasiswaDataKampusApi.bimbingan();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kartu bimbingan');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Form Bimbingan</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Catatan konsultasi bimbingan Tugas Akhir/Skripsi dari dosen pembimbing.</p>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat kartu bimbingan...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div
      v-else-if="!data"
      class="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center text-body-md text-on-surface-variant"
    >
      Kartu bimbingan tersedia setelah pendaftaran judul TA/Skripsi Anda disetujui prodi (menu Pengajuan → Pendaftaran Judul Skripsi/TA).
    </div>

    <template v-else>
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 md:p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-body-md">
          <dl class="grid grid-cols-[170px_1fr] gap-y-2">
            <dt class="text-on-surface-variant">NIM</dt>
            <dd class="text-on-surface">: {{ data.mahasiswa.nim }}</dd>
            <dt class="text-on-surface-variant">Nama</dt>
            <dd class="text-on-surface">: {{ data.mahasiswa.namaLengkap }}</dd>
            <dt class="text-on-surface-variant">Jenjang / Program Studi</dt>
            <dd class="text-on-surface">: {{ [data.mahasiswa.jenjang, data.mahasiswa.prodi].filter(Boolean).join(' / ') || '-' }}</dd>
            <dt class="text-on-surface-variant">Judul</dt>
            <dd class="text-on-surface">: {{ data.judul }}</dd>
          </dl>
          <dl class="grid grid-cols-[170px_1fr] gap-y-2">
            <dt class="text-on-surface-variant">Tanggal Awal</dt>
            <dd class="text-on-surface">: {{ data.tanggalAwal ? formatDate(data.tanggalAwal) : '-' }}</dd>
            <dt class="text-on-surface-variant">Tanggal Akhir</dt>
            <dd class="text-on-surface">: {{ data.tanggalAkhir ? formatDate(data.tanggalAkhir) : '-' }}</dd>
            <dt class="text-on-surface-variant">Pembimbing Utama</dt>
            <dd class="text-on-surface">: {{ data.pembimbingUtama ?? '-' }}</dd>
            <dt class="text-on-surface-variant">Pembimbing Pendamping</dt>
            <dd class="text-on-surface">: {{ data.pembimbingPendamping ?? '-' }}</dd>
          </dl>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-body-sm">
            <thead class="bg-surface-container text-label-md text-on-surface-variant">
              <tr>
                <th class="px-4 py-3 text-center font-medium w-12">No</th>
                <th class="px-4 py-3 text-left font-medium">Tanggal</th>
                <th class="px-4 py-3 text-left font-medium">Pokok Pembahasan</th>
                <th class="px-4 py-3 text-left font-medium">Keterangan</th>
                <th class="px-4 py-3 text-left font-medium">Tanggal Input</th>
                <th class="px-4 py-3 text-left font-medium">Pembimbing</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant align-top">
              <tr v-if="!data.catatan.length">
                <td colspan="6" class="px-4 py-6 text-center text-on-surface-variant">Belum ada catatan bimbingan dari dosen pembimbing.</td>
              </tr>
              <tr v-for="(c, i) in data.catatan" :key="c.id">
                <td class="px-4 py-2 text-center">{{ i + 1 }}</td>
                <td class="px-4 py-2 whitespace-nowrap">{{ formatDate(c.tanggal) }}</td>
                <td class="px-4 py-2 min-w-56 whitespace-pre-line text-on-surface">{{ c.pokokPembahasan }}</td>
                <td class="px-4 py-2 min-w-48 whitespace-pre-line">{{ c.keterangan || '-' }}</td>
                <td class="px-4 py-2 whitespace-nowrap">{{ formatDateTime(c.tanggalInput) }}</td>
                <td class="px-4 py-2 min-w-40">{{ c.pembimbing ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
