<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { pmbGrafikApi, type GrafikPenerimaanRow } from '@/api/pmbGrafik';
import { extractErrorMessage } from '@/api/http';

type Row = GrafikPenerimaanRow & { id: number; no: number };
type SortKey = 'no' | 'prodi' | 'statusKelas' | 'statusDikti' | 'statusPembayaran' | 'catatan' | 'total';

const pageSize = ref(10);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center', sortable: true },
  { key: 'prodi', label: 'Prodi', sortable: true },
  { key: 'statusKelas', label: 'Status Kelas', sortable: true },
  { key: 'statusDikti', label: 'Status Dikti', sortable: true },
  { key: 'statusPembayaran', label: 'Status Pembayaran', sortable: true },
  { key: 'catatan', label: 'Catatan', sortable: true },
  { key: 'total', label: 'Total', align: 'right', sortable: true },
];

const tahunOptions = ref<{ value: number; label: string }[]>([]);
const tahunMasuk = ref<number | ''>('');
const rows = ref<Row[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');
const sortKey = ref<SortKey>('no');
const sortDir = ref<'asc' | 'desc'>('asc');
const page = ref(1);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await pmbGrafikApi.penerimaan(tahunMasuk.value || undefined);
    rows.value = data.map((r, i) => ({ ...r, id: i + 1, no: i + 1 }));
    page.value = 1;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat grafik penerimaan');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const years = await pmbGrafikApi.penerimaanTahunOptions();
    tahunOptions.value = years.map((y) => ({ value: y, label: String(y) }));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan tahun');
  }
  fetchData();
});

watch(tahunMasuk, fetchData);
watch([search, pageSize], () => (page.value = 1));

const handleSort = (key: string) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else {
    sortKey.value = key as SortKey;
    sortDir.value = 'asc';
  }
};

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = q
    ? rows.value.filter((r) =>
        [r.prodi, r.statusKelas, r.statusDikti, r.statusPembayaran, r.catatan, String(r.total)].some((v) =>
          (v ?? '').toLowerCase().includes(q)
        )
      )
    : [...rows.value];
  const dir = sortDir.value === 'asc' ? 1 : -1;
  const key = sortKey.value;
  return list.sort((a, b) => {
    const va = a[key] ?? '';
    const vb = b[key] ?? '';
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

// Grafik: total penerimaan per prodi (mengikuti filter pencarian).
const perProdi = computed(() => {
  const map = new Map<string, number>();
  filtered.value.forEach((r) => map.set(r.prodi, (map.get(r.prodi) ?? 0) + r.total));
  return [...map.entries()].map(([prodi, total]) => ({ prodi, total })).sort((a, b) => b.total - a.total);
});
const grandTotal = computed(() => perProdi.value.reduce((sum, p) => sum + p.total, 0));
const maxProdi = computed(() => Math.max(1, ...perProdi.value.map((p) => p.total)));
</script>

<template>
  <div>
    <PageHeader title="Master Grafik Penerimaan" subtitle="Rekap penerimaan mahasiswa per prodi, status kelas, Dikti, dan pembayaran." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Grafik Penerimaan</div>

      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row gap-3 md:items-center">
        <div class="flex items-center gap-3">
          <span class="font-medium text-label-md text-on-surface whitespace-nowrap">Tahun Masuk</span>
          <div class="w-40">
            <SelectInput v-model="tahunMasuk" :options="tahunOptions" placeholder="Semua Tahun" />
          </div>
        </div>
        <div class="md:ml-auto">
          <SearchInput v-model="search" placeholder="Cari prodi, status, catatan..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable
        :columns="columns"
        :items="pageItems"
        :loading="loading"
        :show-actions="false"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        empty-message="Belum ada data penerimaan mahasiswa"
        @sort="handleSort"
      >
        <template #cell-statusDikti="{ item }">{{ item.statusDikti ?? '-' }}</template>
        <template #cell-statusPembayaran="{ item }">{{ item.statusPembayaran ?? '-' }}</template>
        <template #cell-catatan="{ item }">{{ item.catatan ?? '' }}</template>
        <template #cell-total="{ item }"><span class="tabular-nums font-medium">{{ item.total }}</span></template>
      </DataTable>
      <Pagination v-if="!loading && filtered.length" v-model="page" :meta="meta" />

      <div v-if="!loading && perProdi.length" class="p-4 border-t border-outline-variant">
        <div class="flex items-baseline justify-between mb-4">
          <h3 class="font-semibold text-label-lg text-on-surface">Grafik Penerimaan per Prodi</h3>
          <span class="text-body-sm text-on-surface-variant">Total {{ grandTotal }} mahasiswa</span>
        </div>
        <div class="space-y-3">
          <div v-for="p in perProdi" :key="p.prodi" class="grid grid-cols-[minmax(0,14rem)_1fr_3rem] items-center gap-3">
            <span class="text-body-sm text-on-surface truncate" :title="p.prodi">{{ p.prodi }}</span>
            <div class="h-6 bg-surface-container rounded">
              <div
                class="h-full bg-primary rounded"
                :style="{ width: `${Math.max(2, Math.round((p.total / maxProdi) * 100))}%` }"
                :title="`${p.prodi}: ${p.total}`"
              ></div>
            </div>
            <span class="text-body-sm text-right tabular-nums font-medium">{{ p.total }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
