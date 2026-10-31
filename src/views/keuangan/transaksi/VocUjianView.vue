<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { vocUjianApi } from '@/api/vocUjian';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { toastSuccess, toastError } from '@/utils/swal';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { DosenHonorUjian } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const { canCreate } = usePermission(MENU.KEUANGAN_VOC_UJIAN_MANAGEMENT);

const items = ref<DosenHonorUjian[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const search = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const nominalInputs = reactive<Record<number, number | null>>({});
const payingId = ref<number | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await vocUjianApi.list({ page: page.value, limit: pageSize.value, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
    result.data.forEach((item) => {
      if (!(item.id in nominalInputs)) nominalInputs[item.id] = null;
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data dosen');
  } finally {
    loading.value = false;
  }
};

fetchItems();

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

watch(page, () => fetchItems());
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nidn', label: 'Kode Dosen' },
  { key: 'namaLengkap', label: 'Dosen' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
];

const onNominalInput = (dosenId: number) => (event: Event) => {
  nominalInputs[dosenId] = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handlePembayaran = async (item: DosenHonorUjian) => {
  const nominal = nominalInputs[item.id];
  if (!nominal || nominal <= 0) {
    toastError('Nominal pembayaran wajib diisi');
    return;
  }

  payingId.value = item.id;
  try {
    await vocUjianApi.create({ dosenId: item.id, nominal });
    nominalInputs[item.id] = null;
    toastSuccess(`Pembayaran honor ujian untuk ${item.namaLengkap} berhasil disimpan`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan pembayaran honor ujian'));
  } finally {
    payingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Pembayaran Honor Ujian" subtitle="Transaksi pembayaran honor ujian dosen." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Pembayaran Honor Ujian
      </div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari kode dosen atau nama..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data dosen"
        actions-align="center"
      >
        <template #cell-nidn="{ item }">{{ item.nidn }}</template>
        <template #cell-namaLengkap="{ item }">{{ item.namaLengkap }}</template>
        <template #cell-nominal="{ item }">
          <input
            :value="formatCurrencyInputIdr(nominalInputs[item.id])"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors text-left focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onNominalInput(item.id)"
          />
        </template>
        <template #actions="{ item }">
          <AppButton
            v-if="canCreate"
            :disabled="payingId === item.id"
            @click="handlePembayaran(item as DosenHonorUjian)"
          >
            {{ payingId === item.id ? 'Menyimpan...' : 'Pembayaran' }}
          </AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
