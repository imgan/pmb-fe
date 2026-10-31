<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { nilaiPerkelasApi } from '@/api/nilaiPerkelas';
import { extractErrorMessage } from '@/api/http';
import type { NilaiPerkelasItem } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const router = useRouter();

const search = ref('');
const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<NilaiPerkelasItem[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'kelas', label: 'Kelas', sortable: true },
  { key: 'kodeMataKuliah', label: 'kode MK', sortable: true },
  { key: 'namaMataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'dosen', label: 'Dosen' },
  { key: 'jmlFrs', label: 'Jml FRS', align: 'center' },
  { key: 'jmlUts', label: 'Jml UTS', align: 'center' },
  { key: 'jmlUas', label: 'Jml UAS', align: 'center' },
  { key: 'detail', label: 'Detail', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await nilaiPerkelasApi.list({ page: page.value, limit: pageSize.value, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data nilai perkelas');
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

const openDetail = (id: number) => {
  router.push({ name: 'prodi-nilai-perkelas-detail', params: { id } });
};
</script>

<template>
  <div>
    <PageHeader title="Master Nilai Perkelas" subtitle="Rekap jumlah FRS, UTS, dan UAS per kelas/jadwal kuliah." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Nilai Perkelas</div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data jadwal kuliah">
        <template #cell-dosen="{ item }">{{ item.dosen ?? '-' }}</template>
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
