<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simKehadiranKelasApi } from '@/api/simKehadiranKelas';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { KehadiranKelasRow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

// Semester di sini adalah semester ke- (1..8), sama dengan yang dipakai KRS/JadwalKuliah —
// beda konsep dari GANJIL/GENAP yang dipakai laporan Presentase Kehadiran.
const SEMESTER_OPTIONS: Option[] = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

const tahunOptions = ref<Option[]>([]);
const selectedTahun = ref<number | ''>('');
const selectedSemester = ref<number | ''>('');

const rows = ref<KehadiranKelasRow[]>([]);
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

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simKehadiranKelasApi.list({
      tahun: selectedTahun.value || undefined,
      semester: selectedSemester.value || undefined,
    });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data kehadiran kelas');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Kehadiran Kelas" subtitle="Rekap kehadiran mahasiswa per kelas." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <h2 class="text-title-sm font-medium text-on-surface mb-4">Daftar Kehadiran Mahasiswa Kelas</h2>
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
      <p v-else-if="!loaded" class="p-8 text-center text-body-sm text-on-surface-variant">
        Pilih Tahun &amp; Semester lalu klik Tampilkan.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Matakuliah</th>
              <th class="p-3 border border-outline-variant">Kode Matakuliah</th>
              <th class="p-3 border border-outline-variant">Kelas</th>
              <th class="p-3 border border-outline-variant">Rata-Rata Kehadiran Persentase</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr
              v-for="(row, index) in rows"
              :key="`${row.kodeMataKuliah}-${row.kelas}-${index}`"
              class="hover:bg-surface-container transition-colors"
            >
              <td class="p-3 border border-outline-variant">{{ row.mataKuliah }}</td>
              <td class="p-3 border border-outline-variant">{{ row.kodeMataKuliah }}</td>
              <td class="p-3 border border-outline-variant">{{ row.kelas }}</td>
              <td class="p-3 border border-outline-variant">{{ row.rataRataKehadiranPersentase.toFixed(2) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
