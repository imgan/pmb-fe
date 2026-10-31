<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { vocUjianFtidApi } from '@/api/vocUjianFtid';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { formatRupiahNumber, parseRupiahInput } from '@/utils/format';
import type { VocUjianFtidItem } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const items = ref<VocUjianFtidItem[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const search = ref('');
const loading = ref(true);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await vocUjianFtidApi.list({ page: page.value, limit: pageSize.value, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data voc ujian');
  } finally {
    loading.value = false;
  }
};

watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
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

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nidn', label: 'Kode Dosen' },
  { key: 'namaLengkap', label: 'Dosen' },
  { key: 'nominal', label: 'Nominal' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const draftNominal = reactive<Record<number, number | null>>({});
const nominalFor = (item: VocUjianFtidItem): number | null => {
  if (draftNominal[item.id] === undefined) {
    draftNominal[item.id] = item.vocUjianFtid?.nominal ?? null;
  }
  return draftNominal[item.id];
};

const handleNominalInput = (item: VocUjianFtidItem, event: Event) => {
  const raw = (event.target as HTMLInputElement).value;
  draftNominal[item.id] = parseRupiahInput(raw);
};

const payingId = ref<number | null>(null);
const handleBayar = async (item: VocUjianFtidItem) => {
  const nominal = nominalFor(item);
  if (!nominal || nominal <= 0) {
    toastError('Nominal wajib diisi dan lebih dari 0');
    return;
  }
  const confirmed = await confirmAction({
    title: 'Konfirmasi Pembayaran',
    text: `Bayarkan honor ujian sebesar Rp ${nominal.toLocaleString('id-ID')} untuk ${item.namaLengkap}?`,
    confirmLabel: 'Ya, bayar',
    danger: false,
  });
  if (!confirmed) return;

  payingId.value = item.id;
  try {
    await vocUjianFtidApi.bayar(item.id, nominal);
    toastSuccess('Pembayaran berhasil disimpan');
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan pembayaran'));
  } finally {
    payingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Voc Ujian (FTID)" subtitle="Pembayaran honor ujian untuk dosen kelompok fakultas FTID." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Voc Ujian (FTID)</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari nama atau NIDN..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data dosen FTID">
        <template #cell-nidn="{ item }">{{ item.nidn || '-' }}</template>
        <template #cell-nominal="{ item }">
          <div class="flex items-center gap-2">
            <div class="flex items-center w-44 border border-outline-variant rounded-md bg-surface-container-lowest overflow-hidden">
              <span class="px-2 py-1.5 text-body-sm text-on-surface-variant bg-surface-container-low border-r border-outline-variant">Rp</span>
              <input
                type="text"
                inputmode="numeric"
                class="w-full px-2 py-1.5 text-body-sm bg-transparent outline-none text-right"
                :value="formatRupiahNumber(nominalFor(item))"
                @input="handleNominalInput(item, $event)"
              />
            </div>
            <StatusBadge v-if="item.vocUjianFtid?.paidAt" label="Sudah Dibayar" variant="success" />
          </div>
        </template>
        <template #actions="{ item }">
          <AppButton :disabled="payingId === item.id" @click="handleBayar(item)">
            {{ payingId === item.id ? 'Menyimpan...' : 'Pembayaran' }}
          </AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
