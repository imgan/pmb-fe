<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simIpkApi } from '@/api/simIpk';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { LaporanIpkRow, SemesterGanjilGenap } from '@/types/entities';

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

const rows = ref<LaporanIpkRow[]>([]);
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
    rows.value = await simIpkApi.list({
      tahun: selectedTahun.value || undefined,
      semester: selectedSemester.value || undefined,
    });
    appliedTahun.value = selectedTahun.value;
    appliedSemester.value = selectedSemester.value;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data IPK');
  } finally {
    loading.value = false;
  }
};

handlePeriksa();

const judul = computed(() => {
  const bagian = ['Daftar IPK'];
  if (appliedTahun.value) bagian.push(String(appliedTahun.value));
  if (appliedSemester.value) bagian.push(appliedSemester.value);
  return bagian.join(' ');
});

const grandTotal = computed(() => {
  const jumlahMahasiswa = rows.value.reduce((sum, r) => sum + r.jumlahMahasiswa, 0);
  if (jumlahMahasiswa === 0) return { jumlahMahasiswa: 0, rataRataIpk: 0, rataRataIps: 0 };
  const totalIpk = rows.value.reduce((sum, r) => sum + r.rataRataIpk * r.jumlahMahasiswa, 0);
  const totalIps = rows.value.reduce((sum, r) => sum + r.rataRataIps * r.jumlahMahasiswa, 0);
  return {
    jumlahMahasiswa,
    rataRataIpk: Number((totalIpk / jumlahMahasiswa).toFixed(2)),
    rataRataIps: Number((totalIps / jumlahMahasiswa).toFixed(2)),
  };
});
</script>

<template>
  <div>
    <PageHeader title="Laporan IPK" subtitle="Rekap rata-rata IPK &amp; IPS mahasiswa per program studi." />

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
        Belum ada data IPK untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Tahun Akademik</th>
              <th class="p-3 border border-outline-variant">Semester</th>
              <th class="p-3 border border-outline-variant">Prodi</th>
              <th class="p-3 border border-outline-variant">Jumlah Mahasiswa</th>
              <th class="p-3 border border-outline-variant">rata-rata IPK</th>
              <th class="p-3 border border-outline-variant">rata-rata IPS</th>
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
              <td class="p-2 border border-outline-variant">{{ row.jumlahMahasiswa }}</td>
              <td class="p-2 border border-outline-variant">{{ row.rataRataIpk }}</td>
              <td class="p-2 border border-outline-variant">{{ row.rataRataIps }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td colspan="3" class="p-2 border border-outline-variant text-right">Grand Total :</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.jumlahMahasiswa }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.rataRataIpk }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.rataRataIps }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
