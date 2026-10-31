<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import { dosenSilabusApi } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import type { SilabusMatakuliahRow } from '@/types/entities';

const items = ref<(SilabusMatakuliahRow & { id: number })[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No' },
  { key: 'kodeMk', label: 'Kode' },
  { key: 'namaMk', label: 'Nama Mata Kuliah' },
  { key: 'sks', label: 'SKS', align: 'center' },
  { key: 'silabus', label: 'Silabus' },
];

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await dosenSilabusApi.list();
    items.value = data.map((d, idx) => ({ ...d, id: idx + 1 }));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat silabus matakuliah');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div>
    <PageHeader title="Silabus Matakuliah" subtitle="Dosen / Silabus" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        :show-actions="false"
        empty-message="Anda belum mengampu mata kuliah apa pun"
      >
        <template #cell-no="{ item }">{{ item.id }}</template>
        <template #cell-sks="{ item }">{{ item.sks ?? '-' }}</template>
        <template #cell-silabus="{ item }">
          <span class="text-on-surface-variant">{{ item.silabus || '-' }}</span>
        </template>
      </DataTable>
    </section>
  </div>
</template>
