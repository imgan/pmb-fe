<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import FileInput from '@/components/ui/FileInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { tagihanKuliahApi } from '@/api/tagihanKuliah';
import RiwayatPembayaranModal, { type SemesterRow } from '@/components/keuangan/RiwayatPembayaranModal.vue';
import RowActions from '@/components/ui/RowActions.vue';
import CicilanTagihanModal from '@/components/keuangan/CicilanTagihanModal.vue';
import GenerateCicilanModal from '@/components/keuangan/GenerateCicilanModal.vue';
import ImportVaModal from '@/components/keuangan/ImportVaModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import { formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatCurrencyIdr, formatDateTime } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { toastSuccess, toastError } from '@/utils/swal';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import type {
  AksiImportTagihan,
  ImportTagihanBatch,
  ImportTagihanRow,
  ImportTagihanSummary,
  StatusTagihan,
  TagihanKuliah,
} from '@/types/entities';

/**
 * Tagihan Mahasiswa (sistem tagihan berbasis import): nominal tagihan ditetapkan bagian keuangan
 * lewat file Excel (NIM + tahun akademik + semester), divalidasi & di-preview sebelum diproses.
 * Import ulang memperbarui tagihan yang sama; setiap proses tercatat di Riwayat Import.
 */
const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT);

const STATUS_LABEL: Record<StatusTagihan, string> = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum Bayar' };
const STATUS_VARIANT: Record<StatusTagihan, 'success' | 'warning' | 'danger'> = {
  LUNAS: 'success',
  SEBAGIAN: 'warning',
  BELUM_BAYAR: 'danger',
};
const AKSI_LABEL: Record<AksiImportTagihan, string> = { BARU: 'Baru', UBAH: 'Diperbarui', TETAP: 'Tetap', GAGAL: 'Gagal' };
const AKSI_VARIANT: Record<AksiImportTagihan, 'success' | 'warning' | 'danger' | 'neutral'> = {
  BARU: 'success',
  UBAH: 'warning',
  TETAP: 'neutral',
  GAGAL: 'danger',
};

// ---- Daftar tagihan ----
const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const selectedTahunAjaran = ref<number | ''>('');
const search = ref('');
// Filter status: status sisa semester ini, atau yang masih punya tunggakan semester sebelumnya.
const STATUS_FILTER_OPTIONS = [
  { value: 'BELUM_BAYAR', label: 'Belum Bayar' },
  { value: 'SEBAGIAN', label: 'Sebagian' },
  { value: 'LUNAS', label: 'Lunas' },
  { value: 'ADA_TUNGGAKAN', label: 'Ada Tunggakan' },
];
const statusFilter = ref('');
const items = ref<TagihanKuliah[]>([]);
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await tagihanKuliahApi.list({
      page: page.value,
      limit: pageSize.value,
      tahunAjaranId: selectedTahunAjaran.value || undefined,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data tagihan');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai || b.jenisSemester.localeCompare(a.jenisSemester))
      .map((ta) => ({ value: ta.id, label: formatTahunAjaran(ta) }));
    const active = data.find((ta) => ta.isActive);
    if (active) selectedTahunAjaran.value = active.id;
  } catch {
    tahunAjaranOptions.value = [];
  }
  fetchItems();
  fetchRiwayat();
});

watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
watch(statusFilter, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});

// Export lewat popup: pilih satu/beberapa/semua Tahun Akademik (& status); default mengikuti filter daftar.
const isExportOpen = ref(false);
const exportTahunAjaranIds = ref<number[]>([]);
const exportStatus = ref('');
const exportError = ref<string | null>(null);
const semuaTaDipilih = computed(
  () => tahunAjaranOptions.value.length > 0 && exportTahunAjaranIds.value.length === tahunAjaranOptions.value.length
);
const togglePilihSemuaTa = () => {
  exportTahunAjaranIds.value = semuaTaDipilih.value ? [] : tahunAjaranOptions.value.map((o) => o.value);
};
const openExport = () => {
  exportTahunAjaranIds.value = selectedTahunAjaran.value ? [selectedTahunAjaran.value] : tahunAjaranOptions.value.map((o) => o.value);
  exportStatus.value = statusFilter.value;
  exportError.value = null;
  isExportOpen.value = true;
};

const exporting = ref(false);
const handleExport = async () => {
  if (!exportTahunAjaranIds.value.length) {
    exportError.value = 'Pilih minimal satu tahun akademik';
    return;
  }
  exportError.value = null;
  exporting.value = true;
  try {
    const blob = await tagihanKuliahApi.exportExcel({
      // Semua dipilih = tanpa filter tahun akademik.
      tahunAjaranIds: semuaTaDipilih.value ? undefined : exportTahunAjaranIds.value,
      search: search.value || undefined,
      status: exportStatus.value || undefined,
    });
    const ids = exportTahunAjaranIds.value;
    const ta = semuaTaDipilih.value
      ? 'semua-ta'
      : ids.length === 1
        ? tahunAjaranOptions.value.find((o) => o.value === ids[0])?.label.replace(/[\s/]+/g, '-')
        : `${ids.length}-ta`;
    downloadBlob(blob, `tagihan-mahasiswa-${ta}${exportStatus.value ? `-${exportStatus.value.toLowerCase()}` : ''}.xlsx`);
    isExportOpen.value = false;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal export tagihan'));
  } finally {
    exporting.value = false;
  }
};

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (page.value !== 1) page.value = 1;
    else fetchItems();
  }, 400);
});
const onTahunAjaranChange = () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'prodi', label: 'Prodi' },
  { key: 'semester', label: 'Smt', align: 'center' },
  { key: 'noVirtualAccount', label: 'No Virtual Account' },
  { key: 'totalSks', label: 'Total SKS', align: 'center' },
  { key: 'potongan', label: 'Potongan', align: 'right' },
  { key: 'totalTagihan', label: 'Total Tagihan', align: 'right' },
  { key: 'totalDibayar', label: 'Dibayar', align: 'right' },
  { key: 'sisaTagihan', label: 'Sisa Semester', align: 'right' },
  { key: 'cicilan', label: 'Cicilan', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
];

// ---- Cicilan bulanan ----
const cicilanTagihanId = ref<number | null>(null);
const isCicilanOpen = ref(false);
const isGenerateCicilanOpen = ref(false);
const openCicilan = (item: TagihanKuliah) => {
  cicilanTagihanId.value = item.id;
  isCicilanOpen.value = true;
};
const bulanSingkat = (periode: string) =>
  new Date(`${periode.slice(0, 7)}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

// ---- Edit & hapus tagihan ----
const editTarget = ref<TagihanKuliah | null>(null);
const editForm = ref({
  tagihanAwal: null as number | null,
  totalBayarImport: null as number | null,
  tanggalJatuhTempo: '',
  noVirtualAccount: '',
  keterangan: '',
});
const editError = ref<string | null>(null);
const editSaving = ref(false);
const openEdit = (item: TagihanKuliah) => {
  editTarget.value = item;
  editError.value = null;
  editForm.value = {
    tagihanAwal: Number(item.tagihanAwal ?? Number(item.totalTagihan) + Number(item.potongan ?? 0)),
    totalBayarImport: Number(item.totalBayarImport ?? 0),
    tanggalJatuhTempo: item.tanggalJatuhTempo?.slice(0, 10) ?? '',
    noVirtualAccount: item.noVirtualAccount ?? '',
    keterangan: item.keterangan ?? '',
  };
};
const editTotalSetelahPotongan = computed(() =>
  Math.max((editForm.value.tagihanAwal ?? 0) - Number(editTarget.value?.potongan ?? 0), 0)
);
const saveEdit = async () => {
  if (!editTarget.value) return;
  if (editForm.value.tagihanAwal === null) {
    editError.value = 'Tagihan wajib diisi';
    return;
  }
  const noVirtualAccount = editForm.value.noVirtualAccount.replace(/[\s.-]/g, '');
  if (noVirtualAccount && !/^[0-9]{1,30}$/.test(noVirtualAccount)) {
    editError.value = 'No Virtual Account hanya boleh berisi angka (maks. 30 digit)';
    return;
  }
  editSaving.value = true;
  editError.value = null;
  try {
    await tagihanKuliahApi.update(editTarget.value.id, {
      tagihanAwal: editForm.value.tagihanAwal,
      totalBayarImport: editForm.value.totalBayarImport ?? 0,
      tanggalJatuhTempo: editForm.value.tanggalJatuhTempo || null,
      noVirtualAccount: noVirtualAccount || null,
      keterangan: editForm.value.keterangan.trim() || null,
    });
    toastSuccess('Tagihan diperbarui');
    editTarget.value = null;
    fetchItems();
    if (isRiwayatBayarOpen.value) riwayatModalRef.value?.reload();
  } catch (err) {
    editError.value = extractErrorMessage(err, 'Gagal menyimpan tagihan');
  } finally {
    editSaving.value = false;
  }
};

const deleteTarget = ref<TagihanKuliah | null>(null);
const deleting = ref(false);
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await tagihanKuliahApi.remove(deleteTarget.value.id);
    toastSuccess('Tagihan dihapus');
    deleteTarget.value = null;
    fetchItems();
    if (isRiwayatBayarOpen.value) riwayatModalRef.value?.reload();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus tagihan'));
  } finally {
    deleting.value = false;
  }
};

// ---- Detail: riwayat pembayaran mahasiswa ----
const isRiwayatBayarOpen = ref(false);
const riwayatModalRef = ref<{ reload: () => void } | null>(null);
// Baris periode di modal riwayat -> bentuk TagihanKuliah untuk form edit / dialog hapus yang sama.
const dariRiwayat = (row: SemesterRow): TagihanKuliah =>
  ({
    ...row,
    mahasiswaId: riwayatMahasiswaId.value,
    totalBayarImport: row.dibayarImport,
    sisaTagihan: row.sisa,
    statusTagihan: row.status,
    tahunAjaran: { nama: row.periode },
  }) as unknown as TagihanKuliah;
const editDariRiwayat = (row: SemesterRow) => openEdit(dariRiwayat(row));
const hapusDariRiwayat = (row: SemesterRow) => {
  deleteTarget.value = dariRiwayat(row);
};
const riwayatMahasiswaId = ref<number | null>(null);
const openRiwayatBayar = (item: TagihanKuliah) => {
  riwayatMahasiswaId.value = item.mahasiswaId;
  isRiwayatBayarOpen.value = true;
};

// ---- Import ----
const isImportOpen = ref(false);
const importFile = ref<string | null>(null);
const importFileName = ref<string | null>(null);
const previewing = ref(false);
const committing = ref(false);
const importError = ref<string | null>(null);
const preview = ref<{ summary: ImportTagihanSummary; rows: ImportTagihanRow[] } | null>(null);
const previewFilter = ref<'' | AksiImportTagihan>('');

const isImportVaOpen = ref(false);

const openImport = () => {
  importFile.value = null;
  importFileName.value = null;
  preview.value = null;
  importError.value = null;
  previewFilter.value = '';
  isImportOpen.value = true;
};
watch(importFile, () => {
  preview.value = null;
  importError.value = null;
});

const downloadTemplate = async () => {
  try {
    downloadBlob(await tagihanKuliahApi.importTemplate(), 'template-import-tagihan.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh template'));
  }
};

const handlePreview = async () => {
  if (!importFile.value) {
    importError.value = 'Pilih file Excel terlebih dahulu';
    return;
  }
  previewing.value = true;
  importError.value = null;
  try {
    preview.value = await tagihanKuliahApi.importPreview(importFile.value);
  } catch (err) {
    importError.value = extractErrorMessage(err, 'Gagal membaca file');
  } finally {
    previewing.value = false;
  }
};

const previewRows = computed(() =>
  (preview.value?.rows ?? []).filter((r) => !previewFilter.value || r.aksi === previewFilter.value)
);
const bisaDiproses = computed(() => !!preview.value && preview.value.summary.baru + preview.value.summary.ubah > 0);

const handleCommit = async () => {
  if (!importFile.value || !preview.value) return;
  committing.value = true;
  importError.value = null;
  try {
    const result = await tagihanKuliahApi.importCommit(importFile.value, importFileName.value);
    const s = result.summary;
    toastSuccess(`Import selesai: ${s.baru} baru, ${s.ubah} diperbarui, ${s.tetap} tetap, ${s.gagal} gagal`);
    isImportOpen.value = false;
    page.value = 1;
    fetchItems();
    fetchRiwayat();
  } catch (err) {
    importError.value = extractErrorMessage(err, 'Gagal memproses import');
  } finally {
    committing.value = false;
  }
};

// ---- Riwayat import ----
const riwayat = ref<ImportTagihanBatch[]>([]);
const riwayatMeta = ref({ total: 0, page: 1, limit: 5, totalPages: 1 });
const riwayatPage = ref(1);
const riwayatLoading = ref(false);
const fetchRiwayat = async () => {
  riwayatLoading.value = true;
  try {
    const result = await tagihanKuliahApi.importRiwayat({ page: riwayatPage.value, limit: 5 });
    riwayat.value = result.data;
    riwayatMeta.value = result.meta;
  } catch {
    riwayat.value = [];
  } finally {
    riwayatLoading.value = false;
  }
};
watch(riwayatPage, fetchRiwayat);

const BATCH_VARIANT = { BERHASIL: 'success', SEBAGIAN: 'warning', GAGAL: 'danger' } as const;
const detailBatch = ref<ImportTagihanBatch | null>(null);
const detailLoading = ref(false);
const openDetail = async (id: number) => {
  detailLoading.value = true;
  try {
    detailBatch.value = await tagihanKuliahApi.importRiwayatDetail(id);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat detail import'));
  } finally {
    detailLoading.value = false;
  }
};
const NILAI_LABEL: Record<string, string> = {
  totalTagihan: 'Tagihan',
  totalBayarImport: 'Bayar',
  tunggakan: 'Tunggakan',
  tanggalJatuhTempo: 'Jatuh tempo',
  noVirtualAccount: 'VA',
  keterangan: 'Ket.',
};
const NILAI_TEKS = ['tanggalJatuhTempo', 'noVirtualAccount', 'keterangan'];
const formatNilai = (key: string, v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === '') return '-';
  return NILAI_TEKS.includes(key) ? String(v) : formatCurrencyIdr(Number(v));
};
const ringkasNilai = (nilai: Record<string, string | number | null> | null) =>
  nilai
    ? Object.entries(nilai)
        .filter(([, v]) => v !== null && v !== '')
        .map(([k, v]) => `${NILAI_LABEL[k] ?? k}: ${formatNilai(k, v)}`)
        .join(' · ')
    : '-';
</script>

<template>
  <div>
    <PageHeader
      title="Tagihan Mahasiswa"
      subtitle="Tagihan kuliah per mahasiswa per semester, diimpor dari data bagian keuangan (Excel)."
    >
      <template #actions>
        <AppButton variant="secondary" icon="download" @click="openExport">Export Excel</AppButton>
        <AppButton v-if="canUpdate" variant="secondary" icon="calendar_month" @click="isGenerateCicilanOpen = true">Buat Cicilan</AppButton>
        <AppButton v-if="canCreate" variant="secondary" icon="account_balance" @click="isImportVaOpen = true">Import VA</AppButton>
        <AppButton v-if="canCreate" icon="upload" @click="openImport">Import Tagihan</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-6">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Daftar Tagihan</div>
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
        <div class="w-full md:w-64">
          <SelectInput
            v-model="selectedTahunAjaran"
            placeholder="Semua Tahun Akademik"
            :options="tahunAjaranOptions"
            @change="onTahunAjaranChange"
          />
        </div>
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="STATUS_FILTER_OPTIONS" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable :columns="columns" :items="rows" :loading="loading" actions-align="center" empty-message="Belum ada tagihan. Gunakan Import Tagihan untuk mengisi.">
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-prodi="{ item }">{{ item.mahasiswa?.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-noVirtualAccount="{ item }">
          <span v-if="item.noVirtualAccount" class="tabular-nums whitespace-nowrap">{{ item.noVirtualAccount }}</span>
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #cell-totalSks="{ item }">{{ item.totalSks ?? '-' }}</template>
        <template #cell-totalTagihan="{ item }">{{ formatCurrencyIdr(item.totalTagihan) }}</template>
        <template #cell-totalDibayar="{ item }">{{ formatCurrencyIdr(item.totalDibayar) }}</template>
        <template #cell-sisaTagihan="{ item }">
          <span :class="item.sisaTagihan > 0 ? 'text-error font-medium' : 'text-on-surface'">{{ formatCurrencyIdr(item.sisaTagihan) }}</span>
        </template>
        <template #cell-potongan="{ item }">
          <span v-if="Number(item.potongan) > 0" class="text-[#059669] font-medium">{{ formatCurrencyIdr(Number(item.potongan)) }}</span>
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #cell-cicilan="{ item }">
          <button
            type="button"
            class="text-left hover:underline"
            :title="item.cicilan ? 'Lihat cicilan' : 'Buat cicilan bulanan'"
            @click="openCicilan(item)"
          >
            <template v-if="item.cicilan">
              <span class="block whitespace-nowrap font-medium text-on-surface">{{ item.cicilan.lunas }}/{{ item.cicilan.jumlah }} lunas</span>
              <span
                v-if="item.cicilan.berikutnya"
                class="block whitespace-nowrap text-label-sm"
                :class="item.cicilan.berikutnya.terlambat ? 'text-error' : 'text-on-surface-variant'"
              >
                Ke-{{ item.cicilan.berikutnya.cicilanKe }} · {{ bulanSingkat(item.cicilan.berikutnya.periode) }}
              </span>
            </template>
            <span v-else class="text-primary text-label-md">{{ canUpdate ? 'Atur' : '-' }}</span>
          </button>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge :label="STATUS_LABEL[item.statusTagihan as StatusTagihan]" :variant="STATUS_VARIANT[item.statusTagihan as StatusTagihan]" />
        </template>
        <template #actions="{ item }">
          <RowActions
            show-view
            :can-update="canUpdate"
            :can-delete="canDelete"
            @view="openRiwayatBayar(item)"
            @edit="openEdit(item)"
            @delete="deleteTarget = item"
          />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Riwayat Import</div>
      <div v-if="riwayatLoading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat riwayat...</div>
      <div v-else-if="!riwayat.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada riwayat import.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-body-sm">
          <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th class="px-4 py-2 font-medium">Waktu</th>
              <th class="px-4 py-2 font-medium">File</th>
              <th class="px-4 py-2 font-medium">Oleh</th>
              <th class="px-4 py-2 font-medium text-center">Baris</th>
              <th class="px-4 py-2 font-medium text-center">Baru / Ubah / Tetap / Gagal</th>
              <th class="px-4 py-2 font-medium text-center">Status</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="b in riwayat" :key="b.id">
              <td class="px-4 py-2 whitespace-nowrap">{{ formatDateTime(b.importedAt) }}</td>
              <td class="px-4 py-2">{{ b.fileName ?? '-' }}</td>
              <td class="px-4 py-2">{{ b.importer?.name ?? '-' }}</td>
              <td class="px-4 py-2 text-center">{{ b.totalRows }}</td>
              <td class="px-4 py-2 text-center tabular-nums">
                {{ b.createdRows }} / {{ b.updatedRows }} / {{ b.unchangedRows }} /
                <span :class="b.failedRows ? 'text-error font-medium' : ''">{{ b.failedRows }}</span>
              </td>
              <td class="px-4 py-2 text-center"><StatusBadge :label="b.status" :variant="BATCH_VARIANT[b.status]" /></td>
              <td class="px-4 py-2 text-right">
                <button type="button" class="text-label-md text-primary hover:underline" :disabled="detailLoading" @click="openDetail(b.id)">
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-if="riwayatMeta.totalPages > 1" v-model="riwayatPage" :meta="riwayatMeta" />
    </section>

    <!-- Modal import: pilih file -> preview -> proses -->
    <RiwayatPembayaranModal
      ref="riwayatModalRef"
      v-model="isRiwayatBayarOpen"
      :mahasiswa-id="riwayatMahasiswaId"
      :fetch-fn="tagihanKuliahApi.riwayatMahasiswa"
      :can-edit="canUpdate"
      :can-delete="canDelete"
      @edit="editDariRiwayat"
      @delete="hapusDariRiwayat"
    />

    <Modal
      :model-value="!!editTarget"
      title="Edit Tagihan"
      :subtitle="editTarget ? `${editTarget.mahasiswa?.nim ?? ''} — ${editTarget.mahasiswa?.namaLengkap ?? ''} · Semester ${editTarget.semester}` : ''"
      size="md"
      @update:model-value="(v: boolean) => { if (!v) editTarget = null; }"
    >
      <form class="space-y-4" @submit.prevent="saveEdit">
        <div v-if="editError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ editError }}</div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tagihan (sebelum potongan)<span class="text-error"> *</span></span>
          <input
            :value="formatCurrencyInputIdr(editForm.tagihanAwal)"
            inputmode="numeric"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            @input="editForm.tagihanAwal = parseRupiahInput(($event.target as HTMLInputElement).value)"
          />
          <p class="mt-1 text-label-sm text-on-surface-variant">
            Potongan {{ formatCurrencyIdr(Number(editTarget?.potongan ?? 0)) }} (dari Daftar Potongan) → total tagihan
            <span class="font-semibold text-on-surface">{{ formatCurrencyIdr(editTotalSetelahPotongan) }}</span>
          </p>
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Total Bayar (data keuangan)</span>
          <input
            :value="formatCurrencyInputIdr(editForm.totalBayarImport)"
            inputmode="numeric"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            @input="editForm.totalBayarImport = parseRupiahInput(($event.target as HTMLInputElement).value)"
          />
          <p class="mt-1 text-label-sm text-on-surface-variant">Transaksi kasir yang dicatat setelah import tetap ditambahkan otomatis.</p>
        </label>
        <DateInput v-model="editForm.tanggalJatuhTempo" label="Jatuh Tempo" />
        <TextInput v-model="editForm.noVirtualAccount" label="No Virtual Account" placeholder="Contoh: 8808134612610001" />
        <TextInput v-model="editForm.keterangan" label="Keterangan" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="editTarget = null">Batal</AppButton>
        <AppButton :disabled="editSaving" @click="saveEdit">{{ editSaving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <CicilanTagihanModal v-model="isCicilanOpen" :tagihan-id="cicilanTagihanId" :can-edit="canUpdate" @saved="fetchItems" />
    <ImportVaModal v-model="isImportVaOpen" />

    <GenerateCicilanModal
      v-model="isGenerateCicilanOpen"
      :tahun-ajaran-options="tahunAjaranOptions"
      :default-tahun-ajaran-id="selectedTahunAjaran || null"
      @done="fetchItems"
    />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tagihan"
      :message="`Yakin hapus tagihan ${deleteTarget?.mahasiswa?.nim ?? ''} — ${deleteTarget?.mahasiswa?.namaLengkap ?? ''} semester ${deleteTarget?.semester ?? ''}? Tagihan yang sudah punya transaksi kasir tidak bisa dihapus.`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />


    <Modal v-model="isExportOpen" title="Export Tagihan" subtitle="Pilih tahun akademik yang akan diekspor ke Excel" size="md">
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-label-md text-on-surface">Tahun Akademik<span class="text-error"> *</span></span>
            <label class="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
              <input type="checkbox" :checked="semuaTaDipilih" @change="togglePilihSemuaTa" />
              Pilih Semua
            </label>
          </div>
          <div class="border border-outline-variant rounded-md max-h-56 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            <label
              v-for="o in tahunAjaranOptions"
              :key="o.value"
              class="flex items-center gap-2 px-2 py-1.5 rounded text-body-sm text-on-surface cursor-pointer hover:bg-surface-container"
            >
              <input v-model="exportTahunAjaranIds" type="checkbox" :value="o.value" />
              {{ o.label }}
            </label>
          </div>
          <p class="mt-1 text-label-sm text-on-surface-variant">{{ exportTahunAjaranIds.length }} tahun akademik dipilih</p>
          <p v-if="exportError" class="mt-1 text-label-sm text-error">{{ exportError }}</p>
        </div>
        <SelectInput v-model="exportStatus" label="Status" placeholder="Semua Status" :options="STATUS_FILTER_OPTIONS" />
        <p v-if="search" class="text-label-sm text-on-surface-variant">Pencarian "{{ search }}" juga ikut diterapkan.</p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isExportOpen = false">Batal</AppButton>
        <AppButton icon="download" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Mengekspor...' : 'Export' }}
        </AppButton>
      </template>
    </Modal>

    <Modal v-model="isImportOpen" title="Import Tagihan" subtitle="Data tagihan dari bagian keuangan" size="lg">
      <div class="space-y-4">
        <div v-if="importError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ importError }}</div>
        <div class="text-body-sm text-on-surface-variant space-y-1">
          <p>
            Kolom: <strong>NIM, Tahun Akademik</strong> (mis. 2026/2027), <strong>Semester</strong> (Ganjil/Genap),
            <strong>Total Tagihan, Total Bayar, Tunggakan, Sisa Bayar</strong>, Jatuh Tempo, No Virtual Account, Keterangan.
          </p>
          <p>
            No Virtual Account opsional — sel kosong tidak menghapus VA yang sudah tersimpan. Format kolom ini sebagai
            <strong>Text</strong> di Excel agar nomor panjang tidak berubah.
          </p>
          <p>
            <strong>Sisa Bayar = Total Tagihan − Total Bayar</strong> (tidak termasuk tunggakan). Tunggakan = utang semester
            sebelumnya, disimpan terpisah. NIM + periode yang sudah ada akan <strong>diperbarui</strong>, bukan dibuat baru.
          </p>
          <p>Pembayaran kasir yang dicatat sebelum import dianggap sudah termasuk di Total Bayar file.</p>
        </div>
        <button type="button" class="inline-flex items-center gap-1.5 text-label-md text-primary hover:underline" @click="downloadTemplate">
          <span class="material-symbols-outlined" style="font-size: 18px">description</span>
          Download Template
        </button>
        <FileInput v-model="importFile" v-model:file-name="importFileName" accept=".xlsx" hint="File Excel (.xlsx)" />

        <template v-if="preview">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
            <button
              v-for="k in (['', 'BARU', 'UBAH', 'TETAP', 'GAGAL'] as const)"
              :key="k"
              type="button"
              class="p-2 rounded-md border text-label-sm"
              :class="previewFilter === k ? 'border-primary bg-surface-container' : 'border-outline-variant'"
              @click="previewFilter = k"
            >
              <span class="block text-title-sm font-semibold" :class="k === 'GAGAL' && preview.summary.gagal ? 'text-error' : 'text-on-surface'">
                {{ k === '' ? preview.summary.totalRows : preview.summary[k === 'BARU' ? 'baru' : k === 'UBAH' ? 'ubah' : k === 'TETAP' ? 'tetap' : 'gagal'] }}
              </span>
              {{ k === '' ? 'Semua baris' : AKSI_LABEL[k] }}
            </button>
          </div>
          <div class="border border-outline-variant rounded-md max-h-80 overflow-auto">
            <table class="w-full text-left text-label-sm">
              <thead class="bg-surface-container-low sticky top-0">
                <tr>
                  <th class="p-2 font-semibold">Baris</th>
                  <th class="p-2 font-semibold">NIM / Nama</th>
                  <th class="p-2 font-semibold">Periode</th>
                  <th class="p-2 font-semibold text-right">Tagihan</th>
                  <th class="p-2 font-semibold text-right">Bayar</th>
                  <th class="p-2 font-semibold text-right">Sisa</th>
                  <th class="p-2 font-semibold text-right">Tunggakan</th>
                  <th class="p-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="r in previewRows" :key="r.rowNumber" :class="r.aksi === 'GAGAL' ? 'bg-error-container/40' : ''">
                  <td class="p-2">{{ r.rowNumber }}</td>
                  <td class="p-2">
                    {{ r.nim || '-' }}
                    <span v-if="r.namaLengkap" class="block text-on-surface-variant">{{ r.namaLengkap }}</span>
                  </td>
                  <td class="p-2 whitespace-nowrap">
                    {{ r.periode || '-' }}
                    <span v-if="r.noVirtualAccount" class="block text-on-surface-variant">VA {{ r.noVirtualAccount }}</span>
                  </td>
                  <td class="p-2 text-right whitespace-nowrap">{{ r.totalTagihan != null ? formatCurrencyIdr(r.totalTagihan) : '-' }}</td>
                  <td class="p-2 text-right whitespace-nowrap">{{ r.totalBayar != null ? formatCurrencyIdr(r.totalBayar) : '-' }}</td>
                  <td class="p-2 text-right whitespace-nowrap">{{ r.sisaBayar != null ? formatCurrencyIdr(r.sisaBayar) : '-' }}</td>
                  <td class="p-2 text-right whitespace-nowrap">{{ r.tunggakan != null ? formatCurrencyIdr(r.tunggakan) : '-' }}</td>
                  <td class="p-2">
                    <StatusBadge :label="AKSI_LABEL[r.aksi]" :variant="AKSI_VARIANT[r.aksi]" />
                    <span v-if="r.error" class="block mt-1 text-error">{{ r.error }}</span>
                    <span v-for="p in r.perubahan ?? []" :key="p.field" class="block mt-1 text-on-surface-variant">
                      {{ p.field }}: {{ p.lama ?? '-' }} → {{ p.baru ?? '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="preview.summary.gagal" class="text-body-sm text-error">
            {{ preview.summary.gagal }} baris gagal tidak akan diproses. Perbaiki di file lalu import ulang, atau lanjutkan untuk
            memproses baris yang valid saja.
          </p>
        </template>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isImportOpen = false">Batal</AppButton>
        <AppButton v-if="!preview" icon="preview" :disabled="previewing || !importFile" @click="handlePreview">
          {{ previewing ? 'Memeriksa...' : 'Preview' }}
        </AppButton>
        <AppButton v-else icon="upload" :disabled="committing || !bisaDiproses" @click="handleCommit">
          {{ committing ? 'Memproses...' : bisaDiproses ? `Proses ${preview.summary.baru + preview.summary.ubah} Baris` : 'Tidak ada perubahan' }}
        </AppButton>
      </template>
    </Modal>

    <!-- Modal detail riwayat import -->
    <Modal :model-value="!!detailBatch" title="Detail Import" :subtitle="detailBatch?.fileName ?? ''" size="lg" @update:model-value="detailBatch = null">
      <div v-if="detailBatch" class="border border-outline-variant rounded-md max-h-96 overflow-auto">
        <table class="w-full text-left text-label-sm">
          <thead class="bg-surface-container-low sticky top-0">
            <tr>
              <th class="p-2 font-semibold">Baris</th>
              <th class="p-2 font-semibold">NIM / Nama</th>
              <th class="p-2 font-semibold">Aksi</th>
              <th class="p-2 font-semibold">Nilai lama</th>
              <th class="p-2 font-semibold">Nilai baru / pesan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="l in detailBatch.logs ?? []" :key="l.id">
              <td class="p-2">{{ l.rowNumber ?? '-' }}</td>
              <td class="p-2">
                {{ l.nim ?? '-' }}
                <span v-if="l.mahasiswa" class="block text-on-surface-variant">{{ l.mahasiswa.namaLengkap }}</span>
              </td>
              <td class="p-2"><StatusBadge :label="AKSI_LABEL[l.aksi]" :variant="AKSI_VARIANT[l.aksi]" /></td>
              <td class="p-2 text-on-surface-variant">{{ ringkasNilai(l.nilaiLama) }}</td>
              <td class="p-2">
                <span v-if="l.pesan" class="text-error">{{ l.pesan }}</span>
                <span v-else>{{ ringkasNilai(l.nilaiBaru) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="detailBatch = null">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>
