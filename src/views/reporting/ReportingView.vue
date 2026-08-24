<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import VerticalBarChart, { type BarDatum } from '@/components/charts/VerticalBarChart.vue';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart.vue';
import DonutChart, { type DonutDatum } from '@/components/charts/DonutChart.vue';
import { pesertaApi } from '@/api/peserta';
import { golonganKelasApi } from '@/api/golonganKelas';
import { jurusanApi } from '@/api/jurusan';
import { gelombangApi } from '@/api/gelombang';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError } from '@/utils/swal';
import { formatDate } from '@/utils/format';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Gelombang, GolonganKelas, Jurusan, Peserta, StatusKelulusan, StatusUjian } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const { canUpdate } = usePermission(MENU.REPORTING_MANAGEMENT);

const golonganKelasOptions = ref<{ value: number; label: string }[]>([]);
const jurusanOptions = ref<{ value: number; label: string }[]>([]);
const gelombangOptions = ref<{ value: number; label: string }[]>([]);
const gelombangList = ref<Gelombang[]>([]);
const allJurusan = ref<Jurusan[]>([]);

const filters = reactive({
  golonganKelasId: '' as number | '',
  jurusanId: '' as number | '',
  gelombangId: '' as number | '',
  dateFrom: '',
  dateTo: '',
});

const loading = ref(true);
const error = ref<string | null>(null);
const allItems = ref<Peserta[]>([]);
const page = ref(1);
const pageSize = 10;

const meta = computed<PagingMeta>(() => ({
  total: allItems.value.length,
  page: page.value,
  limit: pageSize,
  totalPages: Math.ceil(allItems.value.length / pageSize) || 1,
}));
const columns: DataTableColumn[] = [
  { key: 'namaLengkap', label: 'Nama', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'golonganKelas', label: 'Golongan Kelas', sortable: true },
  { key: 'jurusan', label: 'Jurusan', sortable: true },
  { key: 'createdAt', label: 'Tanggal Daftar', align: 'right', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
  { key: 'progress', label: 'Progress Seleksi', align: 'center', sortable: true },
];

// Semua data sudah di-loop-fetch ke memori (allItems), jadi sorting dilakukan client-side tanpa round-trip tambahan.
const sortBy = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

const sortValue = (item: Peserta, key: string): string | number => {
  switch (key) {
    case 'namaLengkap':
      return item.namaLengkap;
    case 'email':
      return item.email;
    case 'golonganKelas':
      return item.golonganKelas?.namaKelas ?? '';
    case 'jurusan':
      return item.jurusan?.namaJurusan ?? '';
    case 'createdAt':
      return item.createdAt ?? '';
    case 'status':
      return item.isActive ? 1 : 0;
    case 'progress':
      return item.statusKelulusan;
    default:
      return '';
  }
};

const sortedItems = computed(() => {
  if (!sortBy.value) return allItems.value;
  const key = sortBy.value;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...allItems.value].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
});

const pagedItems = computed(() => sortedItems.value.slice((page.value - 1) * pageSize, page.value * pageSize));

const handleSort = (key: string) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortDir.value = 'asc';
  }
  page.value = 1;
};

const progressSummary = (item: Peserta) => {
  if (item.statusKelulusan === 'diterima') return { label: 'Lulus', variant: 'success' as const };
  if (item.statusKelulusan === 'ditolak') return { label: 'Ditolak', variant: 'danger' as const };
  return { label: 'Sedang Proses', variant: 'warning' as const };
};

const statusUjianOptions = [
  { value: 'belum_ujian', label: 'Belum Ujian' },
  { value: 'lulus', label: 'Lulus' },
  { value: 'tidak_lulus', label: 'Tidak Lulus' },
];
const statusKelulusanOptions = [
  { value: 'menunggu', label: 'Menunggu' },
  { value: 'diterima', label: 'Diterima' },
  { value: 'ditolak', label: 'Ditolak' },
];

const statusTarget = ref<Peserta | null>(null);
const statusForm = reactive({ statusUjian: 'belum_ujian' as StatusUjian, statusKelulusan: 'menunggu' as StatusKelulusan });
const statusSubmitting = ref(false);
const statusError = ref<string | null>(null);

const openStatusModal = (item: Peserta) => {
  statusTarget.value = item;
  statusForm.statusUjian = item.statusUjian;
  statusForm.statusKelulusan = item.statusKelulusan;
  statusError.value = null;
};
const closeStatusModal = () => {
  statusTarget.value = null;
};
const saveStatus = async () => {
  if (!statusTarget.value) return;
  statusSubmitting.value = true;
  statusError.value = null;
  try {
    const updated = await pesertaApi.update(statusTarget.value.id, {
      statusUjian: statusForm.statusUjian,
      statusKelulusan: statusForm.statusKelulusan,
    });
    const idx = allItems.value.findIndex((p) => p.id === updated.id);
    if (idx !== -1) allItems.value[idx] = updated;
    toastSuccess('Status pendaftaran berhasil diperbarui');
    closeStatusModal();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal memperbarui status');
    statusError.value = message;
    toastError(message);
  } finally {
    statusSubmitting.value = false;
  }
};

const fetchReport = async () => {
  loading.value = true;
  error.value = null;
  page.value = 1;
  try {
    const baseQuery = {
      golonganKelasId: filters.golonganKelasId || undefined,
      jurusanId: filters.jurusanId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    };

    const collected: Peserta[] = [];
    let currentPage = 1;
    const limit = 100;
    // Dataset PMB umumnya kecil; loop-fetch semua halaman agar chart, total, dan export merefleksikan seluruh hasil filter (bukan cuma 1 halaman tabel).
    for (;;) {
      const result = await pesertaApi.list({ ...baseQuery, page: currentPage, limit });
      collected.push(...result.data);
      if (collected.length >= result.meta.total || result.data.length < limit) break;
      currentPage += 1;
    }
    allItems.value = collected;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat laporan');
  } finally {
    loading.value = false;
  }
};

watch(() => [filters.golonganKelasId, filters.jurusanId, filters.dateFrom, filters.dateTo], fetchReport);

const onGolonganKelasChange = () => {
  filters.jurusanId = '';
  jurusanOptions.value = filters.golonganKelasId
    ? allJurusan.value
        .filter((j) => j.golonganKelasId === filters.golonganKelasId)
        .map((j) => ({ value: j.id, label: j.namaJurusan }))
    : allJurusan.value.map((j) => ({ value: j.id, label: j.namaJurusan }));
};

const onGelombangChange = () => {
  if (!filters.gelombangId) return;
  const gelombang = gelombangList.value.find((g) => g.id === filters.gelombangId);
  if (gelombang) {
    filters.dateFrom = gelombang.startDate;
    filters.dateTo = gelombang.endDate;
  }
};

const resetFilters = () => {
  filters.golonganKelasId = '';
  filters.jurusanId = '';
  filters.gelombangId = '';
  filters.dateFrom = '';
  filters.dateTo = '';
  jurusanOptions.value = allJurusan.value.map((j) => ({ value: j.id, label: j.namaJurusan }));
};

const jurusanChartData = computed<BarDatum[]>(() => {
  const counts = new Map<string, number>();
  allItems.value.forEach((p) => {
    const name = p.jurusan?.namaJurusan ?? 'Lainnya';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
});

const golonganKelasChartData = computed<DonutDatum[]>(() => {
  const counts = new Map<string, number>();
  allItems.value.forEach((p) => {
    const name = p.golonganKelas?.namaKelas ?? 'Lainnya';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
});

const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' });
const trendChartData = computed<BarDatum[]>(() => {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel.format(d) });
  }
  const counts = new Map(buckets.map((b) => [b.key, 0]));
  allItems.value.forEach((p) => {
    if (!p.createdAt) return;
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
});

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const exportCsv = () => {
  const header = ['Nama', 'Email', 'No Telepon', 'Golongan Kelas', 'Jurusan', 'Tanggal Daftar', 'Status'];
  const rows = allItems.value.map((p) => [
    p.namaLengkap,
    p.email,
    p.noTelepon,
    p.golonganKelas?.namaKelas ?? '-',
    p.jurusan?.namaJurusan ?? '-',
    formatDate(p.createdAt),
    p.isActive ? 'Aktif' : 'Nonaktif',
  ]);
  const csvContent = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell ?? ''))).join(',')).join('\r\n');

  const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `laporan-pendaftar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

onMounted(async () => {
  const [golonganKelasResult, jurusanResult, gelombangResult] = await Promise.all([
    golonganKelasApi.list({ limit: 100 }),
    jurusanApi.list({ limit: 200 }),
    gelombangApi.list({ limit: 100 }),
  ]);
  golonganKelasOptions.value = golonganKelasResult.data.map((g: GolonganKelas) => ({ value: g.id, label: g.namaKelas }));
  allJurusan.value = jurusanResult.data;
  jurusanOptions.value = allJurusan.value.map((j) => ({ value: j.id, label: j.namaJurusan }));
  gelombangList.value = gelombangResult.data;
  gelombangOptions.value = gelombangResult.data.map((g) => ({ value: g.id, label: g.namaGelombang }));

  fetchReport();
});
</script>

<template>
  <div>
    <PageHeader title="Reporting" subtitle="Rekap pendaftar PMB — filter per gelombang, jurusan, golongan kelas, dan rentang tanggal.">
      <template #actions>
        <AppButton icon="download" variant="secondary" :disabled="loading || allItems.length === 0" @click="exportCsv">
          Export CSV
        </AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <SelectInput
          v-model="filters.golonganKelasId"
          label="Golongan Kelas"
          placeholder="Semua"
          :options="golonganKelasOptions"
          @change="onGolonganKelasChange"
        />
        <SelectInput v-model="filters.jurusanId" label="Jurusan" placeholder="Semua" :options="jurusanOptions" />
        <SelectInput
          v-model="filters.gelombangId"
          label="Gelombang"
          placeholder="Semua"
          :options="gelombangOptions"
          @change="onGelombangChange"
        />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Dari</span>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Sampai</span>
          <input
            v-model="filters.dateTo"
            type="date"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </label>
      </div>
      <div class="mt-4">
        <button type="button" class="text-label-sm text-primary hover:underline" @click="resetFilters">
          Reset Filter
        </button>
      </div>
    </section>

    <div v-if="error" class="p-4 mb-6 text-body-sm text-error bg-error-container rounded-lg">{{ error }}</div>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg">
        <p class="text-body-sm text-on-surface-variant mb-1">Total Pendaftar (sesuai filter)</p>
        <p class="font-bold text-display-lg text-primary">{{ loading ? '...' : allItems.length }}</p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg">
        <p class="text-body-sm text-on-surface-variant mb-1">Aktif</p>
        <p class="font-bold text-display-lg text-primary">
          {{ loading ? '...' : allItems.filter((p) => p.isActive).length }}
        </p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg">
        <p class="text-body-sm text-on-surface-variant mb-1">Nonaktif</p>
        <p class="font-bold text-display-lg text-primary">
          {{ loading ? '...' : allItems.filter((p) => !p.isActive).length }}
        </p>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Tren Pendaftaran</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">6 bulan terakhir, sesuai hasil filter.</p>
        <div v-if="loading" class="h-[260px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <VerticalBarChart v-else :data="trendChartData" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Per Golongan Kelas</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Distribusi hasil filter per golongan kelas.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="golonganKelasChartData.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Tidak ada data
        </div>
        <DonutChart v-else :data="golonganKelasChartData" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 lg:col-span-2">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Per Program Studi</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Jurusan dengan jumlah pendaftar terbanyak, sesuai hasil filter.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="jurusanChartData.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Tidak ada data
        </div>
        <HorizontalBarChart v-else :data="jurusanChartData" />
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <h2 class="font-semibold text-headline-md text-on-surface">Detail Pendaftar</h2>
      </div>

      <DataTable
        :columns="columns"
        :items="pagedItems"
        :loading="loading"
        :show-actions="canUpdate"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        empty-message="Tidak ada data sesuai filter"
        @sort="handleSort"
      >
        <template #cell-golonganKelas="{ item }">{{ item.golonganKelas?.namaKelas ?? '-' }}</template>
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-createdAt="{ item }">
          <span class="tabular-nums">{{ formatDate(item.createdAt) }}</span>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'danger'" :label="item.isActive ? 'Aktif' : 'Nonaktif'" />
        </template>
        <template #cell-progress="{ item }">
          <StatusBadge :variant="progressSummary(item).variant" :label="progressSummary(item).label" />
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors text-label-sm font-medium"
            @click="openStatusModal(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
            Ubah Status
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="!!statusTarget"
      title="Ubah Status Pendaftaran"
      :subtitle="statusTarget?.namaLengkap"
      @update:model-value="closeStatusModal"
    >
      <form class="space-y-4" @submit.prevent="saveStatus">
        <div v-if="statusError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ statusError }}
        </div>
        <SelectInput v-model="statusForm.statusUjian" label="Status Ujian" :options="statusUjianOptions" />
        <SelectInput v-model="statusForm.statusKelulusan" label="Status Kelulusan" :options="statusKelulusanOptions" />
        <p class="text-label-sm text-on-surface-variant">
          Status ini akan tampil sebagai progress pendaftaran ("Ujian" dan "Pengumuman Kelulusan") di halaman status peserta.
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeStatusModal">Batal</AppButton>
        <AppButton :disabled="statusSubmitting" @click="saveStatus">{{ statusSubmitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
