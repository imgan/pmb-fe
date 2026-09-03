<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { laporanKeuanganApi } from '@/api/laporanKeuangan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { LaporanTunggakanRow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const rows = ref<LaporanTunggakanRow[]>([]);
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
    const active = data.find((ta) => ta.isActive);
    if (active) selectedTahunAjaran.value = active.id;
  } catch {
    tahunAjaranOptions.value = [];
  }
  handleTampilkan();
});

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await laporanKeuanganApi.bebasTunggakan({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data bebas tunggakan');
  } finally {
    loading.value = false;
  }
};

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'prodi', label: 'Prodi' },
];

const displayRows = computed(() => rows.value.map((r, i) => ({ ...r, id: r.mahasiswaId, no: i + 1 })));
</script>

<template>
  <div>
    <PageHeader title="Laporan Bebas Tunggakan" subtitle="Daftar mahasiswa yang dinyatakan bebas tunggakan (tagihan lunas, tanpa tunggakan lain)." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-72">
          <SelectInput v-model="selectedTahunAjaran" label="Tahun Ajaran" placeholder="-- Semua Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Daftar Mahasiswa Bebas Tunggakan</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="displayRows" :loading="loading" :show-actions="false" empty-message="Belum ada mahasiswa yang bebas tunggakan untuk filter ini">
        <template #cell-nama="{ item }">{{ item.namaLengkap }}</template>
      </DataTable>
    </section>
  </div>
</template>
