<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { evaluasiStudiApi } from '@/api/evaluasiStudi';
import { jurusanApi } from '@/api/jurusan';
import { useCrudPage } from '@/composables/useCrudPage';
import { useProdiContext } from '@/composables/useProdiContext';

const { prodiLocked, prodiPlaceholder } = useProdiContext();

const jurusanOptions = ref<SelectOption[]>([]);
onMounted(async () => {
  const result = await jurusanApi.listProdi({ limit: 200 });
  jurusanOptions.value = result.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
});

const jurusanFilter = ref<number | ''>('');
const hanyaBermasalah = ref(true);

const { items, meta, page, limit, search, loading, error, fetchItems } = useCrudPage({
  fetchList: evaluasiStudiApi.list,
  remove: async () => {},
  extraQuery: () => ({
    jurusanId: jurusanFilter.value || undefined,
    hanyaBermasalah: hanyaBermasalah.value ? 'true' : 'false',
  }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

watch(hanyaBermasalah, onFilterChange);

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'prodi', label: 'Prodi' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'ipk', label: 'IPK', align: 'center' },
  { key: 'tahap1', label: 'Evaluasi 2 Th. Pertama', align: 'center' },
  { key: 'tahap2', label: 'Evaluasi Akhir Masa Normal', align: 'center' },
  { key: 'masaStudi', label: 'Batas Masa Studi', align: 'center' },
];
</script>

<template>
  <div>
    <PageHeader
      title="Evaluasi Studi"
      subtitle="Evaluasi bertahap sesuai Pedoman Akademik — menandai mahasiswa yang perlu ditinjau, keputusan status tetap manual."
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div class="flex flex-col md:flex-row gap-3">
          <div class="w-full md:w-56">
            <SelectInput v-model="jurusanFilter" :placeholder="prodiPlaceholder('Semua Prodi')" :disabled="prodiLocked" :options="jurusanOptions" @change="onFilterChange" />
          </div>
          <div class="w-full md:w-64">
            <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
          </div>
        </div>
        <CheckboxToggle v-model="hanyaBermasalah" label="Hanya tampilkan yang perlu ditinjau" />
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Daftar Evaluasi Studi Mahasiswa Aktif</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        :show-actions="false"
        empty-message="Tidak ada mahasiswa yang perlu ditinjau untuk filter ini"
      >
        <template #cell-ipk="{ item }">{{ item.ipk.toFixed(2) }}</template>
        <template #cell-tahap1="{ item }">
          <StatusBadge
            v-if="item.tahap1.berlaku"
            :label="item.tahap1.memenuhi ? 'Memenuhi' : 'Perlu Ditinjau'"
            :variant="item.tahap1.memenuhi ? 'success' : 'danger'"
          />
          <span v-else class="text-on-surface-variant">Belum berlaku</span>
        </template>
        <template #cell-tahap2="{ item }">
          <StatusBadge
            v-if="item.tahap2.berlaku"
            :label="item.tahap2.memenuhi ? 'Memenuhi' : 'Perlu Ditinjau'"
            :variant="item.tahap2.memenuhi ? 'success' : 'danger'"
          />
          <span v-else class="text-on-surface-variant">Belum berlaku</span>
        </template>
        <template #cell-masaStudi="{ item }">
          <StatusBadge
            :label="item.melebihiMasaStudi ? `Melebihi (maks ${item.maxSemesterWajar})` : 'Dalam Batas'"
            :variant="item.melebihiMasaStudi ? 'danger' : 'success'"
          />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
