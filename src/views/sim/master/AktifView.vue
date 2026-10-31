<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { laporanAktifApi } from '@/api/laporanAktif';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { LaporanAktifGroup, SemesterGanjilGenap } from '@/types/entities';

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

const groups = ref<LaporanAktifGroup[]>([]);
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
    groups.value = await laporanAktifApi.list({
      tahun: selectedTahun.value || undefined,
      semester: selectedSemester.value || undefined,
    });
    appliedTahun.value = selectedTahun.value;
    appliedSemester.value = selectedSemester.value;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mahasiswa aktif');
  } finally {
    loading.value = false;
  }
};

handlePeriksa();

const judul = computed(() => {
  const bagian = ['Daftar Mahasiswa Aktif'];
  if (appliedTahun.value) bagian.push(String(appliedTahun.value));
  if (appliedSemester.value) bagian.push(appliedSemester.value);
  return bagian.join(' ');
});

const grandTotal = computed(() =>
  groups.value.reduce(
    (acc, g) => ({
      baruReguler: acc.baruReguler + g.subtotal.baruReguler,
      baruKaryawan: acc.baruKaryawan + g.subtotal.baruKaryawan,
      baruJumlah: acc.baruJumlah + g.subtotal.baruJumlah,
      pindahReguler: acc.pindahReguler + g.subtotal.pindahReguler,
      pindahKaryawan: acc.pindahKaryawan + g.subtotal.pindahKaryawan,
      pindahJumlah: acc.pindahJumlah + g.subtotal.pindahJumlah,
      total: acc.total + g.subtotal.total,
    }),
    { baruReguler: 0, baruKaryawan: 0, baruJumlah: 0, pindahReguler: 0, pindahKaryawan: 0, pindahJumlah: 0, total: 0 }
  )
);
</script>

<template>
  <div>
    <PageHeader title="Laporan Aktif" subtitle="Rekap status keaktifan mahasiswa per program studi &amp; SMT." />

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
      <p v-else-if="loaded && !groups.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data mahasiswa aktif untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-center border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th rowspan="2" class="p-3 border border-outline-variant align-middle">Tahun Akademik/Semester</th>
              <th rowspan="2" class="p-3 border border-outline-variant align-middle">Prodi</th>
              <th rowspan="2" class="p-3 border border-outline-variant align-middle">SMT</th>
              <th colspan="3" class="p-2 border border-outline-variant">Baru</th>
              <th colspan="3" class="p-2 border border-outline-variant">Pindahan/RPL</th>
              <th rowspan="2" class="p-3 border border-outline-variant align-middle">Total</th>
            </tr>
            <tr>
              <th class="p-2 border border-outline-variant font-medium">Reguler</th>
              <th class="p-2 border border-outline-variant font-medium">Karyawan</th>
              <th class="p-2 border border-outline-variant font-medium">Jumlah</th>
              <th class="p-2 border border-outline-variant font-medium">Reguler</th>
              <th class="p-2 border border-outline-variant font-medium">Karyawan</th>
              <th class="p-2 border border-outline-variant font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <template v-for="group in groups" :key="group.namaJurusan">
              <tr
                v-for="row in group.rows"
                :key="`${group.namaJurusan}-${row.smt}`"
                class="hover:bg-surface-container transition-colors"
              >
                <td class="p-2 border border-outline-variant">{{ appliedTahun }} /{{ appliedSemester }}</td>
                <td class="p-2 border border-outline-variant text-left">
                  {{ group.kodeProdi ? group.kodeProdi.toUpperCase() : group.namaJurusan.toUpperCase() }}
                </td>
                <td class="p-2 border border-outline-variant">{{ row.smt }}</td>
                <td class="p-2 border border-outline-variant">{{ row.baruReguler || '' }}</td>
                <td class="p-2 border border-outline-variant">{{ row.baruKaryawan || '' }}</td>
                <td class="p-2 border border-outline-variant font-medium">{{ row.baruJumlah }}</td>
                <td class="p-2 border border-outline-variant">{{ row.pindahReguler || '' }}</td>
                <td class="p-2 border border-outline-variant">{{ row.pindahKaryawan || '' }}</td>
                <td class="p-2 border border-outline-variant font-medium">{{ row.pindahJumlah }}</td>
                <td class="p-2 border border-outline-variant font-semibold">{{ row.total }}</td>
              </tr>
              <tr class="bg-surface-container-low font-semibold">
                <td class="p-2 border border-outline-variant"></td>
                <td colspan="2" class="p-2 border border-outline-variant text-right">Total mhs :</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.baruReguler }}</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.baruKaryawan }}</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.baruJumlah }}</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.pindahReguler }}</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.pindahKaryawan }}</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.pindahJumlah }}</td>
                <td class="p-2 border border-outline-variant">{{ group.subtotal.total }}</td>
              </tr>
            </template>
            <tr v-if="groups.length" class="bg-surface-container font-semibold">
              <td class="p-2 border border-outline-variant"></td>
              <td colspan="2" class="p-2 border border-outline-variant text-right">Grand Total :</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.baruReguler }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.baruKaryawan }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.baruJumlah }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.pindahReguler }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.pindahKaryawan }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.pindahJumlah }}</td>
              <td class="p-2 border border-outline-variant">{{ grandTotal.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
