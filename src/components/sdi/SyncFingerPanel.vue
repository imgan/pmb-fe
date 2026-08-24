<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import FileInput from '@/components/ui/FileInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { usePermission } from '@/composables/usePermission';
import { createSyncFingerApi } from '@/api/syncFingerLog';
import { extractErrorMessage } from '@/api/http';
import { downloadBlob } from '@/utils/download';
import { toastError, toastSuccess, confirmAction } from '@/utils/swal';
import type { MenuCode } from '@/constants/menuCodes';
import type { SyncFingerLog, SyncFingerMesin, SyncFingerPullResult } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const props = defineProps<{
  mesin: SyncFingerMesin;
  menuCode: MenuCode | string;
  title: string;
}>();

const api = createSyncFingerApi(props.mesin);
const { canCreate } = usePermission(props.menuCode);

const items = ref<SyncFingerLog[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const search = ref('');
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nik', label: 'NIK' },
  { key: 'karyawan', label: 'Nama Karyawan' },
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'status', label: 'Status' },
];

const formatTanggal = (value: string) =>
  new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await api.list({ page: page.value, limit: 10, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data sync finger');
  } finally {
    loading.value = false;
  }
};

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

watch(page, fetchItems);

onMounted(fetchItems);

const isPullOpen = ref(false);
const pullFile = ref<string | null>(null);
const pulling = ref(false);
const pullError = ref<string | null>(null);
const pullResult = ref<SyncFingerPullResult | null>(null);
const downloadingTemplate = ref(false);

const openPull = () => {
  isPullOpen.value = true;
  pullFile.value = null;
  pullError.value = null;
  pullResult.value = null;
};

const closePull = () => {
  isPullOpen.value = false;
};

const handleDownloadTemplate = async () => {
  downloadingTemplate.value = true;
  try {
    const blob = await api.template();
    downloadBlob(blob, `template-sync-finger-${props.mesin.toLowerCase()}.xlsx`);
  } catch (err) {
    pullError.value = extractErrorMessage(err, 'Gagal mengunduh template');
  } finally {
    downloadingTemplate.value = false;
  }
};

const handlePull = async () => {
  if (!pullFile.value) {
    pullError.value = 'Pilih file hasil export mesin fingerprint (.xlsx) terlebih dahulu';
    return;
  }
  pulling.value = true;
  pullError.value = null;
  pullResult.value = null;
  try {
    pullResult.value = await api.pull(pullFile.value);
    if (pullResult.value.successCount > 0) {
      toastSuccess(`${pullResult.value.successCount} baris data berhasil ditarik dari mesin`);
      page.value = 1;
      fetchItems();
    }
    if (pullResult.value.errorCount === 0) {
      closePull();
    }
  } catch (err) {
    pullError.value = extractErrorMessage(err, 'Gagal menarik data dari mesin');
  } finally {
    pulling.value = false;
  }
};

const inserting = ref(false);
const handleInsert = async () => {
  const confirmed = await confirmAction({
    title: 'Masukan Data Ke Database?',
    text: 'Seluruh data hasil tarikan mesin yang belum diproses akan dicocokkan dengan data karyawan dan disimpan sebagai data resmi.',
    danger: false,
    confirmLabel: 'Ya, proses',
  });
  if (!confirmed) return;

  inserting.value = true;
  try {
    const result = await api.insert();
    if (result.processedCount === 0) {
      toastSuccess('Tidak ada data baru yang perlu diproses');
    } else {
      toastSuccess(
        `${result.processedCount} data diproses (${result.matchedCount} cocok dengan karyawan, ${result.unmatchedCount} tidak dikenali)`
      );
    }
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memasukkan data ke database'));
  } finally {
    inserting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader :title="title" subtitle="Sinkronisasi data absensi dari mesin fingerprint ke database.">
      <template v-if="canCreate" #actions>
        <AppButton icon="file_download" @click="openPull">Tarik Data Dari Mesin</AppButton>
        <AppButton variant="secondary" icon="save" :disabled="inserting" @click="handleInsert">
          {{ inserting ? 'Memproses...' : 'Masukan Data Ke Database' }}
        </AppButton>
      </template>
    </PageHeader>

    <div class="mb-4 px-4 py-2.5 rounded-md bg-primary-container text-on-primary-container text-body-sm text-center font-medium">
      Semua Data Sync Finger
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIK..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="No data available in table">
        <template #cell-karyawan="{ item }">{{ item.karyawan?.namaLengkap ?? '-' }}</template>
        <template #cell-tanggal="{ item }">{{ formatTanggal(item.tanggal) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge
            :label="item.status === 'PROCESSED' ? 'Diproses' : 'Menunggu'"
            :variant="item.status === 'PROCESSED' ? 'success' : 'warning'"
          />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isPullOpen" title="Tarik Data Dari Mesin" size="md" @update:model-value="closePull">
      <div class="space-y-4">
        <div v-if="pullError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ pullError }}
        </div>
        <p class="text-body-sm text-on-surface-variant">
          Aplikasi ini tidak terhubung langsung ke mesin fingerprint. Export log absensi dari mesin (NIK + Tanggal),
          lalu upload file-nya di sini. Unduh template di bawah untuk contoh format kolomnya.
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-label-md text-primary hover:underline disabled:opacity-60 disabled:no-underline"
          :disabled="downloadingTemplate"
          @click="handleDownloadTemplate"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">description</span>
          {{ downloadingTemplate ? 'Mengunduh template...' : 'Download Template' }}
        </button>
        <FileInput v-model="pullFile" accept=".xlsx" hint="File Excel (.xlsx) hasil export mesin fingerprint" />

        <div v-if="pullResult" class="space-y-2">
          <p class="text-body-sm text-on-surface">
            <strong class="text-success">{{ pullResult.successCount }} berhasil</strong>
            <span v-if="pullResult.errorCount > 0">
              &middot; <strong class="text-error">{{ pullResult.errorCount }} gagal</strong>
            </span>
          </p>
          <div v-if="pullResult.errors.length" class="border border-outline-variant rounded-md max-h-48 overflow-y-auto">
            <table class="w-full text-left text-label-sm">
              <thead class="bg-surface-container-low sticky top-0">
                <tr>
                  <th class="p-2 font-semibold text-on-surface-variant">Baris</th>
                  <th class="p-2 font-semibold text-on-surface-variant">Pesan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="err in pullResult.errors" :key="err.row">
                  <td class="p-2 text-on-surface-variant">{{ err.row }}</td>
                  <td class="p-2 text-on-surface">{{ err.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closePull">Tutup</AppButton>
        <AppButton :disabled="pulling" @click="handlePull">{{ pulling ? 'Menarik data...' : 'Tarik Data' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
