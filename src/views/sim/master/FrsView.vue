<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simFrsApi } from '@/api/simFrs';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { LaporanFrsRow, SemesterGanjilGenap } from '@/types/entities';

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
const appliedTahun = ref<number | ''>('');
const appliedSemester = ref<SemesterGanjilGenap | ''>('');

const rows = ref<LaporanFrsRow[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200 });
    const uniqueYears = [...new Set(data.map((ta) => ta.tahunMulai))].sort((a, b) => b - a);
    tahunOptions.value = uniqueYears.map((year) => ({ value: year, label: String(year) }));
  } catch {
    tahunOptions.value = [];
  }
});

const handlePeriksa = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simFrsApi.list({
      tahun: selectedTahun.value || undefined,
      semester: selectedSemester.value || undefined,
    });
    appliedTahun.value = selectedTahun.value;
    appliedSemester.value = selectedSemester.value;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data FRS');
  } finally {
    loading.value = false;
  }
};

handlePeriksa();

const judul = computed(() => {
  const bagian = ['Daftar FRS'];
  if (appliedTahun.value) bagian.push(String(appliedTahun.value));
  if (appliedSemester.value) bagian.push(appliedSemester.value);
  return bagian.join(' ');
});

const grandTotal = computed(() => ({
  reguler: rows.value.reduce((sum, r) => sum + r.reguler, 0),
  pindahanRpl: rows.value.reduce((sum, r) => sum + r.pindahanRpl, 0),
  jumlah: rows.value.reduce((sum, r) => sum + r.jumlah, 0),
}));
</script>

<template>
  <div>
    <PageHeader title="Laporan FRS" subtitle="Rekap Formulir Rencana Studi mahasiswa per program studi." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-56">
          <SelectInput v-model="selectedTahun" placeholder="-- Pilih Tahun --" :options="tahunOptions" />
        </div>
        <div class="w-full md:w-56">
          <SelectInput v-model="selectedSemester" placeholder="-- Pilih Semester --" :options="SEMESTER_OPTIONS" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handlePeriksa">{{ loading ? 'Memeriksa...' : 'Periksa' }}</AppButton>
      </div>
    </section>

    <h2 class="text-title-md font-medium text-on-surface mb-3">{{ judul }}</h2>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data FRS untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Tahun Akademik</th>
              <th class="p-3 border border-outline-variant">Semester</th>
              <th class="p-3 border border-outline-variant">Prodi</th>
              <th class="p-3 border border-outline-variant">Reguler</th>
              <th class="p-3 border border-outline-variant">Pindahan/RPL</th>
              <th class="p-3 border border-outline-variant">Jumlah</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr
              v-for="(row, index) in rows"
              :key="`${row.tahunAkademik}-${row.semester}-${row.prodi}-${index}`"
              class="hover:bg-surface-container transition-colors"
            >
              <td class="p-2 border border-outline-variant">{{ row.tahunAkademik }}</td>
              <td class="p-2 border border-outline-variant">{{ row.semester }}</td>
              <td class="p-2 border border-outline-variant uppercase">{{ row.prodi }}</td>
              <td class="p-2 border border-outline-variant">{{ row.reguler }}</td>
              <td class="p-2 border border-outline-variant">{{ row.pindahanRpl }}</td>
              <td class="p-2 border border-outline-variant font-medium">{{ row.jumlah }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td colspan="3" class="p-2 border border-outline-variant text-right">Grand Total :</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.reguler }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.pindahanRpl }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.jumlah }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
