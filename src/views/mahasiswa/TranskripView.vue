<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { mahasiswaNilaiApi } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import type { Transkrip } from '@/types/entities';

const transkrip = ref<Transkrip | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    transkrip.value = await mahasiswaNilaiApi.transkrip();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat transkrip');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Transkrip Nilai</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Rekap seluruh nilai dari semester pertama hingga saat ini.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>
    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>

    <template v-else-if="transkrip">
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-6 flex flex-wrap gap-8">
        <div>
          <p class="text-body-sm text-on-surface-variant">Total SKS Lulus</p>
          <p class="text-headline-md font-semibold text-primary">{{ transkrip.totalSks }}</p>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant">IPK</p>
          <p class="text-headline-md font-semibold text-primary">{{ transkrip.ipk.toFixed(2) }}</p>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Rincian Nilai per Semester</div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-[#F1F5F9] border-b border-outline-variant">
              <tr class="text-label-md text-primary font-semibold">
                <th class="p-3">Semester</th>
                <th class="p-3">Kode MK</th>
                <th class="p-3">Mata Kuliah</th>
                <th class="p-3 text-center">SKS</th>
                <th class="p-3 text-center">Grade</th>
                <th class="p-3 text-center">Mutu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
              <template v-for="s in transkrip.perSemester" :key="s.semester">
                <tr v-for="n in s.nilai" :key="`${s.semester}-${n.kodeMataKuliah}`">
                  <td class="p-3">{{ s.semester }}</td>
                  <td class="p-3">{{ n.kodeMataKuliah }}</td>
                  <td class="p-3">{{ n.namaMataKuliah }}</td>
                  <td class="p-3 text-center">{{ n.sks }}</td>
                  <td class="p-3 text-center font-semibold">{{ n.grade }}</td>
                  <td class="p-3 text-center">{{ n.mutu.toFixed(2) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <p v-if="!transkrip.perSemester.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada nilai yang tercatat.
        </p>
      </section>
    </template>
  </div>
</template>
