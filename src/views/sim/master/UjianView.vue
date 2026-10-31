<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simLaporanUjianApi } from '@/api/simLaporanUjian';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { JenisUjian, LaporanUjianRow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const JENIS_UJIAN_OPTIONS: Option[] = [
  { value: 'UTS', label: 'UTS' },
  { value: 'UAS', label: 'UAS' },
];

const tahunOptions = ref<Option[]>([]);
const selectedTahun = ref<number | ''>('');
const selectedJenisUjian = ref<JenisUjian | ''>('');
const appliedJenisUjian = ref<JenisUjian | ''>('');

const rows = ref<LaporanUjianRow[]>([]);
const grandTotal = ref(0);
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

const handlePeriksa = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await simLaporanUjianApi.list({
      tahun: selectedTahun.value || undefined,
      jenisUjian: selectedJenisUjian.value || undefined,
    });
    rows.value = result.data;
    grandTotal.value = result.grandTotal;
    appliedJenisUjian.value = selectedJenisUjian.value;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data kehadiran ujian');
  } finally {
    loading.value = false;
  }
};

handlePeriksa();

const judul = computed(() => `Daftar Kehadiran Ujian ${appliedJenisUjian.value || ''}`.trim());
</script>

<template>
  <div>
    <PageHeader title="Laporan Ujian" subtitle="Rekap kehadiran ujian UTS/UAS mahasiswa per program studi." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-56">
          <SelectInput v-model="selectedTahun" placeholder="-- Pilih Tahun --" :options="tahunOptions" />
        </div>
        <div class="w-full md:w-56">
          <SelectInput v-model="selectedJenisUjian" placeholder="-- Pilih UTS/UAS --" :options="JENIS_UJIAN_OPTIONS" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handlePeriksa">{{ loading ? 'Memeriksa...' : 'Periksa' }}</AppButton>
      </div>
    </section>

    <h2 class="text-title-md font-medium text-on-surface mb-3">{{ judul }}</h2>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data kehadiran ujian untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Prodi</th>
              <th class="p-3 border border-outline-variant">Jumlah</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="row in rows" :key="row.prodi" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant uppercase">{{ row.prodi }}</td>
              <td class="p-2 border border-outline-variant font-medium">{{ row.jumlah }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td class="p-2 border border-outline-variant text-right">Grand Total :</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
