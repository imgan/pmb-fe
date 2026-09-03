<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simRekapitulasiPengajaranApi } from '@/api/simRekapitulasiPengajaran';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { RekapitulasiPengajaranRow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const rows = ref<RekapitulasiPengajaranRow[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai)
      .map((ta) => ({ value: ta.id, label: `${ta.nama} - ${ta.jenisSemester}` }));
  } catch {
    tahunAjaranOptions.value = [];
  }
});

const handlePeriksa = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simRekapitulasiPengajaranApi.list({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data rekapitulasi pengajaran');
  } finally {
    loading.value = false;
  }
};

handlePeriksa();

const grandTotal = computed(() => ({
  hadir: rows.value.reduce((sum, r) => sum + r.hadir, 0),
  tidakHadir: rows.value.reduce((sum, r) => sum + r.tidakHadir, 0),
  izin: rows.value.reduce((sum, r) => sum + r.izin, 0),
  sakit: rows.value.reduce((sum, r) => sum + r.sakit, 0),
  totalPertemuan: rows.value.reduce((sum, r) => sum + r.totalPertemuan, 0),
}));
</script>

<template>
  <div>
    <PageHeader title="Rekapitulasi Pengajaran" subtitle="Rekap jumlah pertemuan mengajar per dosen." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedTahunAjaran" label="Tahun Ajaran" placeholder="-- Pilih Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handlePeriksa">{{ loading ? 'Memeriksa...' : 'Periksa' }}</AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data pengajaran untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">NIDN</th>
              <th class="p-3 border border-outline-variant">Dosen</th>
              <th class="p-3 border border-outline-variant text-center">Hadir</th>
              <th class="p-3 border border-outline-variant text-center">Tidak Hadir</th>
              <th class="p-3 border border-outline-variant text-center">Izin</th>
              <th class="p-3 border border-outline-variant text-center">Sakit</th>
              <th class="p-3 border border-outline-variant text-center">Total Pertemuan</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="row in rows" :key="row.dosenId" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ row.nidn }}</td>
              <td class="p-2 border border-outline-variant">{{ row.namaLengkap }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.hadir }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.tidakHadir }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.izin }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.sakit }}</td>
              <td class="p-2 border border-outline-variant text-center font-medium">{{ row.totalPertemuan }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td colspan="2" class="p-2 border border-outline-variant text-right">Grand Total :</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.hadir }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.tidakHadir }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.izin }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.sakit }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.totalPertemuan }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
