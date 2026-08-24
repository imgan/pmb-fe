<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { laporanRealisasiApi } from '@/api/laporanRealisasi';
import { extractErrorMessage } from '@/api/http';
import type { RealisasiMengajarItem } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const programOptions = ref<{ value: string; label: string }[]>([]);
const selectedProgram = ref('');
const appliedProgram = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<RealisasiMengajarItem[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'hariJam', label: 'Hari Jam' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'kodeMataKuliah', label: 'Kode MK' },
  { key: 'namaMataKuliah', label: 'Mata Kuliah' },
  { key: 'dosen', label: 'Dosen' },
  { key: 'jam', label: 'Jam', align: 'center' },
  { key: 'ruangan', label: 'Ruang' },
  { key: 'realisasi', label: 'Realisasi', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await laporanRealisasiApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      kelas: appliedProgram.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data realisasi mengajar');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedProgram.value = selectedProgram.value;
  page.value = 1;
  fetchItems();
};

watch(page, fetchItems);
watch(pageSize, () => {
  page.value = 1;
  fetchItems();
});

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

onMounted(async () => {
  try {
    const kelasList = await laporanRealisasiApi.kelasOptions();
    programOptions.value = kelasList.map((k) => ({ value: k, label: k }));
  } catch {
    programOptions.value = [];
  }
  fetchItems();
});
</script>

<template>
  <div>
    <PageHeader title="Cetak Realisasi Mengajar" subtitle="Rekap realisasi mengajar dosen per jadwal kuliah." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedProgram" placeholder="-- Pilih Program --" :options="programOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedProgram ? `Data Cetak Realisasi Mengajar - Kelas ${appliedProgram}` : 'Semua Data Cetak Realisasi Mengajar' }}
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data realisasi mengajar">
        <template #cell-dosen="{ item }">{{ item.dosen ?? '-' }}</template>
        <template #cell-jam="{ item }">{{ item.jam ?? '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan ?? '-' }}</template>
        <template #cell-realisasi="{ item }">
          <span class="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-label-sm font-medium">
            {{ item.realisasi }}
          </span>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
