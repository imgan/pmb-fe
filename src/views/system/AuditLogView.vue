<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { auditLogApi } from '@/api/auditLog';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import type { AuditLog, AuditLogSnapshot } from '@/types/entities';

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  namaLengkap: 'Nama Lengkap',
  namaKelas: 'Nama Kelas',
  namaJurusan: 'Nama Jurusan',
  namaKampus: 'Nama Kampus',
  namaGelombang: 'Nama Gelombang',
  namaInformasi: 'Nama Informasi',
  namaKelengkapan: 'Nama Kelengkapan',
  namaPendaftaran: 'Nama Pendaftaran',
  namaBeasiswa: 'Nama Beasiswa',
  isActive: 'Aktif',
  isWajib: 'Wajib',
  isBeasiswa: 'Khusus Beasiswa',
  isDelete: 'Dihapus',
  createdAt: 'Dibuat Pada',
  updatedAt: 'Diubah Pada',
  createdBy: 'Dibuat Oleh (ID)',
  updatedBy: 'Diubah Oleh (ID)',
  golonganKelasId: 'Golongan Kelas (ID)',
  jurusanId: 'Jurusan (ID)',
  gelombangId: 'Gelombang (ID)',
  statusKuliah: 'Status Kuliah',
  statusBeasiswa: 'Status Beasiswa',
  statusUjian: 'Status Ujian',
  statusKelulusan: 'Status Kelulusan',
};

const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) return formatDateTime(value);
  return String(value);
};

interface DiffRow {
  key: string;
  before: string;
  after: string;
  changed: boolean;
}

const parseChanges = (item: AuditLog): AuditLogSnapshot | null => {
  if (!item.changes) return null;
  try {
    return JSON.parse(item.changes) as AuditLogSnapshot;
  } catch {
    return null;
  }
};

const diffRows = (item: AuditLog): DiffRow[] => {
  const parsed = parseChanges(item);
  if (!parsed) return [];
  const keys = new Set([...Object.keys(parsed.before ?? {}), ...Object.keys(parsed.after ?? {})]);
  return Array.from(keys).map((key) => {
    const beforeVal = parsed.before?.[key];
    const afterVal = parsed.after?.[key];
    return {
      key,
      before: formatValue(beforeVal),
      after: formatValue(afterVal),
      changed: JSON.stringify(beforeVal) !== JSON.stringify(afterVal),
    };
  });
};

const search = ref('');
const filters = reactive({
  module: '',
  action: '' as string,
  actorType: '' as string,
  dateFrom: '',
  dateTo: '',
});

const moduleOptions = ref<{ value: string; label: string }[]>([]);
const actionOptions = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'register', label: 'Register' },
  { value: 'forgot_password', label: 'Forgot Password' },
  { value: 'reset_password', label: 'Reset Password' },
];
const actorTypeOptions = [
  { value: 'staff', label: 'Staff/Admin' },
  { value: 'peserta', label: 'Peserta' },
  { value: 'public', label: 'Publik' },
];

const items = ref<AuditLog[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const page = ref(1);
const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });

const columns: DataTableColumn[] = [
  { key: 'createdAt', label: 'Waktu', sortable: true },
  { key: 'actorName', label: 'Aktor', sortable: true },
  { key: 'module', label: 'Modul', sortable: true },
  { key: 'action', label: 'Aksi', align: 'center', sortable: true },
  { key: 'description', label: 'Deskripsi', sortable: true },
  { key: 'statusCode', label: 'Status', align: 'center', sortable: true },
];

const sortBy = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const handleSort = (key: string) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortDir.value = 'asc';
  }
  page.value = 1;
  fetchItems();
};

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await auditLogApi.list({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      module: filters.module || undefined,
      action: filters.action || undefined,
      actorType: filters.actorType || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      sortBy: sortBy.value || undefined,
      sortDir: sortBy.value ? sortDir.value : undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat audit log');
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

watch(() => [filters.module, filters.action, filters.actorType, filters.dateFrom, filters.dateTo], () => {
  page.value = 1;
  fetchItems();
});

watch(page, fetchItems);

const resetFilters = () => {
  search.value = '';
  filters.module = '';
  filters.action = '';
  filters.actorType = '';
  filters.dateFrom = '';
  filters.dateTo = '';
  page.value = 1;
  fetchItems();
};

onMounted(async () => {
  try {
    const modules = await auditLogApi.modules();
    moduleOptions.value = modules.map((m) => ({ value: m, label: m }));
  } catch {
    moduleOptions.value = [];
  }
  fetchItems();
});

const actorTypeLabel = (item: AuditLog) =>
  ({ staff: 'Staff', peserta: 'Peserta', public: 'Publik' })[item.actorType];

const viewTarget = ref<AuditLog | null>(null);
const openDetail = (item: AuditLog) => {
  viewTarget.value = item;
};
const closeDetail = () => {
  viewTarget.value = null;
};

const actionVariant = (action: string) =>
  (
    {
      create: 'success',
      update: 'warning',
      delete: 'danger',
      login: 'success',
      register: 'success',
      forgot_password: 'neutral',
      reset_password: 'neutral',
    } as Record<string, 'success' | 'warning' | 'danger' | 'neutral'>
  )[action] ?? 'neutral';

const statusVariant = (statusCode: number): 'success' | 'danger' =>
  statusCode >= 200 && statusCode < 300 ? 'success' : 'danger';

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
const exportCsv = () => {
  const header = ['Waktu', 'Aktor', 'Email', 'Tipe Aktor', 'Modul', 'Aksi', 'Deskripsi', 'Status', 'IP'];
  const rows = items.value.map((i) => [
    formatDateTime(i.createdAt),
    i.actorName ?? '-',
    i.actorEmail ?? '-',
    actorTypeLabel(i),
    i.module,
    i.action,
    i.description,
    String(i.statusCode),
    i.ipAddress ?? '-',
  ]);
  const csvContent = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\r\n');
  const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const activeFilterCount = computed(
  () => Object.values(filters).filter(Boolean).length + (search.value ? 1 : 0)
);
</script>

<template>
  <div>
    <PageHeader title="Audit Log" subtitle="Riwayat seluruh aktivitas (tambah, ubah, hapus, login) yang terjadi di sistem.">
      <template #actions>
        <AppButton icon="download" variant="secondary" :disabled="loading || items.length === 0" @click="exportCsv">
          Export CSV
        </AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        <div class="lg:col-span-2">
          <SearchInput v-model="search" placeholder="Cari aktor, deskripsi, atau path..." />
        </div>
        <SelectInput v-model="filters.module" label="Modul" placeholder="Semua Modul" :options="moduleOptions" />
        <SelectInput v-model="filters.action" label="Aksi" placeholder="Semua Aksi" :options="actionOptions" />
        <SelectInput v-model="filters.actorType" label="Tipe Aktor" placeholder="Semua" :options="actorTypeOptions" />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Dari</span>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </label>
      </div>
      <div class="mt-4 flex items-center gap-4">
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Sampai</span>
          <input
            v-model="filters.dateTo"
            type="date"
            class="w-full md:w-56 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </label>
        <button
          v-if="activeFilterCount > 0"
          type="button"
          class="text-label-sm text-primary hover:underline"
          @click="resetFilters"
        >
          Reset Filter ({{ activeFilterCount }})
        </button>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <p class="text-label-sm text-on-surface-variant">Menampilkan {{ items.length }} dari {{ meta.total }} log</p>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        empty-message="Belum ada aktivitas tercatat"
        @sort="handleSort"
      >
        <template #cell-createdAt="{ item }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDateTime(item.createdAt) }}</span>
        </template>
        <template #cell-actorName="{ item }">
          <div>
            <p class="text-on-surface font-medium">{{ item.actorName ?? 'Pengunjung' }}</p>
            <p class="text-label-sm text-on-surface-variant">
              {{ actorTypeLabel(item) }}<span v-if="item.actorEmail"> &middot; {{ item.actorEmail }}</span>
            </p>
          </div>
        </template>
        <template #cell-action="{ item }">
          <StatusBadge :label="item.action" :variant="actionVariant(item.action)" />
        </template>
        <template #cell-description="{ item }">
          <p class="max-w-md">{{ item.description }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.method }} {{ item.path }}</p>
        </template>
        <template #cell-statusCode="{ item }">
          <StatusBadge :label="String(item.statusCode)" :variant="statusVariant(item.statusCode)" />
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Lihat Detail"
            @click="openDetail(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="!!viewTarget"
      title="Detail Aktivitas"
      subtitle="Informasi lengkap siapa yang melakukan aksi ini dan konteksnya."
      size="lg"
      @update:model-value="closeDetail"
    >
      <div v-if="viewTarget" class="space-y-6">
        <div class="border border-outline-variant rounded-lg p-4 bg-surface-container-low">
          <p class="text-label-sm text-on-surface-variant mb-1">Dilakukan oleh</p>
          <p class="text-headline-md font-semibold text-on-surface">{{ viewTarget.actorName ?? 'Pengunjung (Publik)' }}</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge :label="actorTypeLabel(viewTarget)" />
            <span v-if="viewTarget.actorEmail" class="text-body-sm text-on-surface-variant">{{ viewTarget.actorEmail }}</span>
            <span v-if="viewTarget.actorId" class="text-body-sm text-on-surface-variant">&middot; ID: {{ viewTarget.actorId }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Waktu</p>
            <p class="text-body-md text-on-surface font-medium">{{ formatDateTime(viewTarget.createdAt) }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Alamat IP</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.ipAddress ?? '-' }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Modul</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.module }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Aksi</p>
            <StatusBadge :label="viewTarget.action" :variant="actionVariant(viewTarget.action)" />
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Endpoint</p>
            <p class="text-body-sm text-on-surface font-mono">{{ viewTarget.method }} {{ viewTarget.path }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Status Response</p>
            <StatusBadge :label="String(viewTarget.statusCode)" :variant="statusVariant(viewTarget.statusCode)" />
          </div>
        </div>

        <div class="border-t border-outline-variant pt-4">
          <p class="text-label-sm text-on-surface-variant mb-1">Deskripsi</p>
          <p class="text-body-md text-on-surface">{{ viewTarget.description }}</p>
        </div>

        <div v-if="diffRows(viewTarget).length > 0" class="border-t border-outline-variant pt-4">
          <p class="text-label-sm text-on-surface-variant mb-3">
            {{ viewTarget.action === 'delete' ? 'Data yang Dihapus' : viewTarget.action === 'create' ? 'Data yang Dibuat' : 'Perubahan Data' }}
          </p>
          <div class="border border-outline-variant rounded-lg overflow-hidden">
            <table class="w-full text-left text-body-sm">
              <thead class="bg-surface-container-low">
                <tr>
                  <th class="p-2.5 font-semibold text-label-sm text-on-surface-variant">Field</th>
                  <th v-if="viewTarget.action !== 'create'" class="p-2.5 font-semibold text-label-sm text-on-surface-variant">Sebelum</th>
                  <th v-if="viewTarget.action !== 'delete'" class="p-2.5 font-semibold text-label-sm text-on-surface-variant">Sesudah</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr
                  v-for="row in diffRows(viewTarget)"
                  :key="row.key"
                  :class="row.changed ? 'bg-warning-container/30' : ''"
                >
                  <td class="p-2.5 font-medium text-on-surface whitespace-nowrap">{{ fieldLabel(row.key) }}</td>
                  <td v-if="viewTarget.action !== 'create'" class="p-2.5 text-on-surface-variant">{{ row.before }}</td>
                  <td
                    v-if="viewTarget.action !== 'delete'"
                    class="p-2.5"
                    :class="row.changed ? 'text-on-surface font-semibold' : 'text-on-surface-variant'"
                  >
                    {{ row.after }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeDetail">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>
