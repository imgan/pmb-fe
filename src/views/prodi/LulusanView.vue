<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { prodiLulusanApi } from '@/api/prodiLulusan';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import type { LulusanItem, StatusMasukMahasiswa } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const STAT_KULIAH_LABEL: Record<StatusMasukMahasiswa, string> = {
  BARU: 'Reguler',
  TRANSFER_LUAR: 'Pindahan',
  TRANSFER_DALAM: 'Pindahan',
  TRANSFER_LUAR_KARYAWAN: 'Pindahan',
  TRANSFER_DALAM_KARYAWAN: 'Pindahan',
};

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);
const search = ref('');

const items = ref<LulusanItem[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'lahir', label: 'Tmp/Tgl Lahir' },
  { key: 'tahunMasuk', label: 'Tahun Masuk', align: 'center' },
  { key: 'totalSks', label: 'Total SKS', align: 'center' },
  { key: 'ipk', label: 'IPK', align: 'center' },
  { key: 'predikat', label: 'Predikat', align: 'center' },
  { key: 'skYudisium', label: 'No. SK Yudisium' },
  { key: 'statKuliah', label: 'Stat. Kuliah', align: 'center' },
  { key: 'tahunLulus', label: 'Tahun Lulus', align: 'center' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await prodiLulusanApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data master lulusan');
  } finally {
    loading.value = false;
  }
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

onMounted(fetchItems);
</script>

<template>
  <div>
    <PageHeader title="Master Lulusan" subtitle="Data mahasiswa yang telah dinyatakan lulus (yudisium)." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Lulusan</div>

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

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada mahasiswa yang lulus">
        <template #cell-nama="{ item }">
          <p class="font-medium text-on-surface">{{ item.namaLengkap?.toUpperCase() }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.namaJurusan ?? '-' }}</p>
        </template>
        <template #cell-lahir="{ item }">{{ item.tempatLahir ?? '-' }}, {{ item.tanggalLahir ? formatDate(item.tanggalLahir) : '-' }}</template>
        <template #cell-skYudisium="{ item }">{{ item.noSk ?? '-' }}</template>
        <template #cell-statKuliah="{ item }">
          <span
            class="inline-flex px-2 py-0.5 rounded-full text-label-sm"
            :class="item.statusMasuk === 'BARU' ? 'bg-primary-container text-on-primary-container' : 'bg-secondary-container text-on-secondary-container'"
          >
            {{ item.statusMasuk ? STAT_KULIAH_LABEL[item.statusMasuk] : '-' }}
          </span>
        </template>
        <template #cell-tahunLulus="{ item }">{{ item.tanggalYudisium ? new Date(item.tanggalYudisium).getFullYear() : '-' }}</template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
