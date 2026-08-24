<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { extractErrorMessage } from '@/api/http';
import type { HariKuliah, JadwalKuliah } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const router = useRouter();

const HARI_LABEL: Record<HariKuliah, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
};

const programOptions = ref<{ value: string; label: string }[]>([]);
const selectedProgram = ref('');
const appliedProgram = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<JadwalKuliah[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({
    ...item,
    no: (page.value - 1) * pageSize.value + index + 1,
    total: item.sksTeori + item.sksPraktik + item.sksLab,
  }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'hari', label: 'Hari' },
  { key: 'ruangan', label: 'Ruang' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'kodeMataKuliah', label: 'Kode MK' },
  { key: 'namaMataKuliah', label: 'Mata Kuliah' },
  { key: 'dosenKordinator', label: 'Dosen' },
  { key: 'jam', label: 'Jam', align: 'center' },
  { key: 'sksTeori', label: 'Teori', align: 'center' },
  { key: 'sksPraktik', label: 'Prak', align: 'center' },
  { key: 'sksLab', label: 'Lab', align: 'center' },
  { key: 'total', label: 'Total', align: 'center' },
  { key: 'detail', label: 'Detail', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await jadwalKuliahApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      kelas: appliedProgram.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data monitoring');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedProgram.value = selectedProgram.value;
  page.value = 1;
  fetchItems();
};

const openDetail = (id: number) => {
  router.push({ name: 'baak-monitoring-detail', params: { id } });
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
    const kelasList = await jadwalKuliahApi.kelasOptions();
    programOptions.value = kelasList.map((k) => ({ value: k, label: k }));
  } catch {
    programOptions.value = [];
  }
  fetchItems();
});
</script>

<template>
  <div>
    <PageHeader title="Master Monitoring" subtitle="Pantau jadwal perkuliahan per program/kelas." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedProgram" placeholder="-- Pilih Program --" :options="programOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedProgram ? `Data Master Monitoring - Kelas ${appliedProgram}` : 'Semua Data Master Monitoring' }}
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

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data jadwal kuliah">
        <template #cell-hari="{ item }">{{ item.hari && item.hari.length ? item.hari.map((h) => HARI_LABEL[h]).join(', ') : '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan || '-' }}</template>
        <template #cell-dosenKordinator="{ item }">{{ item.dosenKordinator?.namaLengkap ?? '-' }}</template>
        <template #cell-jam="{ item }">{{ item.jam ?? '-' }}</template>
        <template #cell-detail="{ item }">
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-on-primary hover:opacity-90 transition-opacity"
            title="Lihat Detail"
            @click="openDetail(item.id)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">description</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
