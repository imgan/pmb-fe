<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { simStudentBodyApi } from '@/api/simStudentBody';
import { extractErrorMessage } from '@/api/http';
import type { StudentBodyGroup } from '@/types/entities';

const groups = ref<StudentBodyGroup[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    groups.value = await simStudentBodyApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data student body');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <PageHeader title="Student Body" subtitle="Rekap mahasiswa terdaftar, lulus, dan keluar/DO per program studi &amp; tahun masuk." />

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Daftar Mahasiswa Student Body</div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="!groups.length" class="p-8 text-center text-body-sm text-on-surface-variant">Belum ada data mahasiswa.</p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-center border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th rowspan="2" class="p-3 border border-outline-variant align-middle">Tahun Masuk</th>
              <th colspan="3" class="p-2 border border-outline-variant">Mahasiswa Terdaftar</th>
              <th colspan="3" class="p-2 border border-outline-variant">Mahasiswa Lulus</th>
              <th colspan="3" class="p-2 border border-outline-variant">Mahasiswa K/DO</th>
              <th rowspan="2" class="p-3 border border-outline-variant align-middle">Jumlah</th>
            </tr>
            <tr>
              <th class="p-2 border border-outline-variant font-medium">Baru</th>
              <th class="p-2 border border-outline-variant font-medium">Alih Jenjang/RPL</th>
              <th class="p-2 border border-outline-variant font-medium">Jum</th>
              <th class="p-2 border border-outline-variant font-medium">Baru</th>
              <th class="p-2 border border-outline-variant font-medium">Alih Jenjang/RPL</th>
              <th class="p-2 border border-outline-variant font-medium">Jum</th>
              <th class="p-2 border border-outline-variant font-medium">Baru</th>
              <th class="p-2 border border-outline-variant font-medium">Alih Jenjang/RPL</th>
              <th class="p-2 border border-outline-variant font-medium">Jum</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <template v-for="group in groups" :key="group.namaJurusan">
              <tr class="bg-surface-container">
                <td colspan="11" class="p-2 border border-outline-variant text-left font-semibold uppercase">
                  {{ group.namaJurusan }}
                </td>
              </tr>
              <tr v-for="row in group.rows" :key="row.tahunMasuk" class="hover:bg-surface-container transition-colors">
                <td class="p-2 border border-outline-variant">{{ row.tahunMasuk }}</td>
                <td class="p-2 border border-outline-variant">{{ row.terdaftarBaru || '' }}</td>
                <td class="p-2 border border-outline-variant">{{ row.terdaftarAlih || '' }}</td>
                <td class="p-2 border border-outline-variant font-medium">{{ row.terdaftarJumlah }}</td>
                <td class="p-2 border border-outline-variant">{{ row.lulusBaru || '' }}</td>
                <td class="p-2 border border-outline-variant">{{ row.lulusAlih || '' }}</td>
                <td class="p-2 border border-outline-variant font-medium">{{ row.lulusJumlah }}</td>
                <td class="p-2 border border-outline-variant">{{ row.kdoBaru || '' }}</td>
                <td class="p-2 border border-outline-variant">{{ row.kdoAlih || '' }}</td>
                <td class="p-2 border border-outline-variant font-medium">{{ row.kdoJumlah }}</td>
                <td class="p-2 border border-outline-variant font-semibold">{{ row.jumlah }}</td>
              </tr>
              <tr class="bg-surface-container-low font-semibold">
                <td colspan="10" class="p-2 border border-outline-variant text-right">Total :</td>
                <td class="p-2 border border-outline-variant">{{ group.total }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
