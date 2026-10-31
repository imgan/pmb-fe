<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simPresentaseKehadiranApi } from '@/api/simPresentaseKehadiran';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { PresentaseKehadiranRow, SemesterGanjilGenap } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const SEMESTER_OPTIONS: Option[] = [
  { value: 'GANJIL', label: 'Ganjil' },
  { value: 'GENAP', label: 'Genap' },
];

const tahunOptions = ref<Option[]>([]);
const selectedTahun = ref<number | ''>('');
const selectedSemester = ref<SemesterGanjilGenap | ''>('');

const rows = ref<PresentaseKehadiranRow[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200, isActive: true });
    const uniqueYears = [...new Set(data.map((ta) => ta.tahunMulai))].sort((a, b) => b - a);
    tahunOptions.value = uniqueYears.map((year) => ({ value: year, label: String(year) }));
  } catch {
    tahunOptions.value = [];
  }
});

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simPresentaseKehadiranApi.list({
      tahun: selectedTahun.value || undefined,
      semester: selectedSemester.value || undefined,
    });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data presentase kehadiran');
  } finally {
    loading.value = false;
  }
};

handleTampilkan();
</script>

<template>
  <div>
    <PageHeader title="Presentase Kehadiran" subtitle="Rekap persentase kehadiran mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <h2 class="text-title-sm font-medium text-on-surface mb-4">Daftar Kehadiran Mahasiswa</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        <SelectInput v-model="selectedTahun" label="Tahun" placeholder="Pilih Tahun" :options="tahunOptions" />
        <SelectInput v-model="selectedSemester" label="Semester" placeholder="Pilih Semester" :options="SEMESTER_OPTIONS" />
      </div>
      <AppButton class="mt-4" icon="search" :disabled="loading" @click="handleTampilkan">
        {{ loading ? 'Memuat...' : 'Tampilkan' }}
      </AppButton>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data kehadiran untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Tahun Akademik</th>
              <th class="p-3 border border-outline-variant">Semester</th>
              <th class="p-3 border border-outline-variant">Prodi</th>
              <th class="p-3 border border-outline-variant">Rata-Rata Kehadiran</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="(row, index) in rows" :key="`${row.tahunAkademik}-${row.semester}-${row.prodi}-${index}`" class="hover:bg-surface-container transition-colors">
              <td class="p-3 border border-outline-variant">{{ row.tahunAkademik }}</td>
              <td class="p-3 border border-outline-variant">{{ row.semester }}</td>
              <td class="p-3 border border-outline-variant uppercase">{{ row.prodi }}</td>
              <td class="p-3 border border-outline-variant">{{ row.rataRataKehadiran }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
