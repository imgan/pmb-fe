<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { pmbGrafikApi, type GrafikDaftarUlangRow } from '@/api/pmbGrafik';
import { extractErrorMessage } from '@/api/http';

// Kolom tahun memakai key = tahun (string); sort per kolom tahun membaca row.values[tahun].
type Row = GrafikDaftarUlangRow & { id: number };

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));

const tahun = ref<number[]>([]);
const rows = ref<Row[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');
const sortKey = ref('prodi');
const sortDir = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const pageSize = ref<number>(10);

const columns = computed<DataTableColumn[]>(() => [
  { key: 'prodi', label: 'Tahun', sortable: true },
  ...tahun.value.map((t) => ({ key: String(t), label: String(t), align: 'center' as const, sortable: true })),
  { key: 'total', label: 'Total', align: 'center', sortable: true },
]);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await pmbGrafikApi.daftarUlang();
    tahun.value = data.tahun;
    rows.value = data.rows.map((r, i) => ({ ...r, id: i + 1 }));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat grafik daftar ulang');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
watch([search, pageSize], () => (page.value = 1));

const handleSort = (key: string) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
};

const sortValue = (r: Row, key: string): string | number =>
  key === 'prodi' ? r.prodi : key === 'total' ? r.total : (r.values[key] ?? 0);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = q ? rows.value.filter((r) => r.prodi.toLowerCase().includes(q)) : [...rows.value];
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const va = sortValue(a, sortKey.value);
    const vb = sortValue(b, sortKey.value);
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
  });
});

const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
}));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));

// Grafik: total daftar ulang per tahun (semua prodi yang lolos pencarian).
const perTahun = computed(() =>
  tahun.value.map((t) => ({ tahun: t, total: filtered.value.reduce((sum, r) => sum + (r.values[t] ?? 0), 0) }))
);
const grandTotal = computed(() => perTahun.value.reduce((sum, p) => sum + p.total, 0));
const maxTahun = computed(() => Math.max(1, ...perTahun.value.map((p) => p.total)));
</script>

<template>
  <div>
    <PageHeader title="Master Grafik DU" subtitle="Jumlah mahasiswa daftar ulang per prodi per tahun masuk." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Grafik DU</div>

      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row gap-3 md:items-center">
        <div class="flex items-center gap-2 text-body-sm text-on-surface">
          <span>Show</span>
          <div class="w-24">
            <SelectInput v-model="pageSize" :options="PAGE_SIZE_OPTIONS" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="md:ml-auto">
          <SearchInput v-model="search" placeholder="Cari prodi..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="pageItems"
        :loading="loading"
        :show-actions="false"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        empty-message="Belum ada data mahasiswa daftar ulang"
        @sort="handleSort"
      >
        <template #cell-prodi="{ item }"><span class="font-semibold whitespace-nowrap">{{ item.prodi }}</span></template>
        <template v-for="t in tahun" :key="t" #[`cell-${t}`]="{ item }">
          <span class="tabular-nums">{{ item.values[t] || '' }}</span>
        </template>
        <template #cell-total="{ item }"><span class="tabular-nums font-semibold">{{ item.total }}</span></template>
      </DataTable>
      <Pagination v-if="!loading && filtered.length" v-model="page" :meta="meta" />

      <div v-if="!loading && grandTotal" class="p-4 border-t border-outline-variant">
        <div class="flex items-baseline justify-between mb-4">
          <h3 class="font-semibold text-label-lg text-on-surface">Grafik Daftar Ulang per Tahun</h3>
          <span class="text-body-sm text-on-surface-variant">Total {{ grandTotal }} mahasiswa</span>
        </div>
        <div class="overflow-x-auto">
          <div class="flex items-end gap-3 h-48" :style="{ minWidth: `${perTahun.length * 48}px` }">
            <div v-for="p in perTahun" :key="p.tahun" class="flex-1 flex flex-col items-center h-full">
              <span class="text-label-sm tabular-nums text-on-surface-variant">{{ p.total || '' }}</span>
              <div class="flex-1 w-full flex items-end justify-center">
                <div
                  class="w-6 bg-primary rounded-t"
                  :style="{ height: `${Math.round((p.total / maxTahun) * 100)}%` }"
                  :title="`${p.tahun}: ${p.total}`"
                ></div>
              </div>
              <span class="mt-1 text-label-sm text-on-surface-variant">{{ p.tahun }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
