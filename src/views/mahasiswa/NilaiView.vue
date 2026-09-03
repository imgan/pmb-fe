<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { mahasiswaNilaiApi } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import type { KhsSemester } from '@/types/entities';

const perSemester = ref<KhsSemester[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    perSemester.value = await mahasiswaNilaiApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat nilai');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Nilai (KHS)</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Kartu Hasil Studi per semester.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>
    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>

    <div v-else class="space-y-6">
      <section
        v-for="s in perSemester"
        :key="s.semester"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
      >
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between flex-wrap gap-2">
          <span>Semester {{ s.semester }}</span>
          <span>IP Semester: {{ s.ipSemester.toFixed(2) }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-[#F1F5F9] border-b border-outline-variant">
              <tr class="text-label-md text-primary font-semibold">
                <th class="p-3">Kode MK</th>
                <th class="p-3">Mata Kuliah</th>
                <th class="p-3 text-center">SKS</th>
                <th class="p-3 text-center">Nilai</th>
                <th class="p-3 text-center">Grade</th>
                <th class="p-3 text-center">Mutu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
              <tr v-for="n in s.nilai" :key="n.kodeMataKuliah">
                <td class="p-3">{{ n.kodeMataKuliah }}</td>
                <td class="p-3">{{ n.namaMataKuliah }}</td>
                <td class="p-3 text-center">{{ n.sks }}</td>
                <td class="p-3 text-center">{{ n.nilai }}</td>
                <td class="p-3 text-center font-semibold">{{ n.grade }}</td>
                <td class="p-3 text-center">{{ n.mutu.toFixed(2) }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-outline-variant font-semibold text-body-sm">
              <tr>
                <td class="p-3" colspan="2">Total</td>
                <td class="p-3 text-center">{{ s.totalSks }}</td>
                <td class="p-3" colspan="2"></td>
                <td class="p-3 text-center">{{ s.totalMutu.toFixed(2) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p v-if="!perSemester.length" class="text-center py-12 text-body-sm text-on-surface-variant">
        Belum ada nilai yang tercatat.
      </p>
    </div>
  </div>
</template>
