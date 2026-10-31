<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { mataKuliahApi } from '@/api/mataKuliah';
import { kurikulumApi } from '@/api/kurikulum';
import { useCrudPage } from '@/composables/useCrudPage';
import type { MataKuliah } from '@/types/entities';

// Halaman baca saja: mata kuliah semua kurikulum (dikelola prodi di Kurikulum → Master Kurikulum).
const kurikulumFilter = ref<number | ''>('');
const kurikulumOptions = ref<SelectOption[]>([]);
onMounted(async () => {
  try {
    kurikulumOptions.value = (await kurikulumApi.options()).map((k) => ({ value: k.value, label: k.label }));
  } catch {
    kurikulumOptions.value = [];
  }
});

const { items, meta, page, limit, search, loading, error, sortBy, sortDir, handleSort, fetchItems } = useCrudPage<MataKuliah>({
  fetchList: mataKuliahApi.list,
  remove: mataKuliahApi.remove,
  extraQuery: () => ({ kurikulumId: kurikulumFilter.value || undefined }),
});
fetchItems();
const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'kode', label: 'Kode MK', sortable: true },
  { key: 'mataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'kurikulum', label: 'Kurikulum' },
  { key: 'semester', label: 'Semester', align: 'center', sortable: true },
  { key: 'sksTotal', label: 'SKS', align: 'center' },
];
</script>

<template>
  <div>
    <PageHeader title="Mata Kuliah" subtitle="Mata kuliah per kurikulum (dikelola prodi di Kurikulum → Master Kurikulum), dipakai saat membuat jadwal." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row gap-3 md:justify-between">
        <div class="w-full md:w-80">
          <SelectInput v-model="kurikulumFilter" placeholder="Semua Kurikulum" :options="kurikulumOptions" @change="onFilterChange" />
        </div>
        <SearchInput v-model="search" placeholder="Cari kode atau nama mata kuliah..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        :show-actions="false"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-kurikulum="{ item }">{{ item.kurikulum?.nama ?? '-' }}</template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
      </DataTable>
      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
