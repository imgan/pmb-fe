<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { pembimbingTaSkripsiApi, type PembimbingTaSkripsiPayload } from '@/api/pembimbingTaSkripsi';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { Dosen, PembimbingKe, PembimbingTaSkripsi } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT);

const PEMBIMBING_KE_OPTIONS: { value: PembimbingKe; label: string }[] = [
  { value: 'UTAMA', label: 'Utama' },
  { value: 'PENDAMPING', label: 'Pendamping' },
];
const pembimbingKeLabel = (value: PembimbingKe) => PEMBIMBING_KE_OPTIONS.find((o) => o.value === value)?.label ?? value;

const dosenList = ref<Dosen[]>([]);
const loadingDosen = ref(true);
const periodeOptions = ref<{ value: string; label: string }[]>([]);
const selectedPeriode = ref('');
const appliedPeriode = ref('');

const loadPeriodeOptions = async () => {
  const options = await pembimbingTaSkripsiApi.filterOptions();
  periodeOptions.value = options.map((o, index) => ({
    value: `${o.periodeMulai}:${o.periodeSelesai}`,
    label: `[${index + 1}] ${formatDate(o.periodeMulai)} s/d ${formatDate(o.periodeSelesai)}`,
  }));
};

onMounted(async () => {
  try {
    const [dosenResult] = await Promise.all([dosenApi.list({ page: 1, limit: 500 }), loadPeriodeOptions()]);
    dosenList.value = dosenResult.data;
  } finally {
    loadingDosen.value = false;
  }
});
const dosenOptions = computed(() => dosenList.value.map((d) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` })));

const {
  items,
  meta,
  page,
  limit,
  search,
  loading,
  error,
  sortBy,
  sortDir,
  handleSort,
  deleteTarget,
  deleting,
  isFormOpen,
  editingItem,
  fetchItems,
  openCreate,
  openEdit,
  closeForm,
  onSaved,
  requestDelete,
  cancelDelete,
  confirmDelete,
} = useCrudPage({
  fetchList: pembimbingTaSkripsiApi.list,
  remove: pembimbingTaSkripsiApi.remove,
  extraQuery: () => {
    const [periodeMulai, periodeSelesai] = appliedPeriode.value ? appliedPeriode.value.split(':') : [undefined, undefined];
    return { periodeMulai, periodeSelesai };
  },
});

fetchItems();

const handlePeriksa = () => {
  appliedPeriode.value = selectedPeriode.value;
  page.value = 1;
  fetchItems();
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'namaDosen', label: 'Nama Dosen' },
  { key: 'noSk', label: 'No. SK' },
  { key: 'pemb', label: 'Pemb', align: 'center' },
  { key: 'totalBimbingan', label: 'Total Bimbingan', align: 'center' },
  { key: 'periode', label: 'Periode' },
  { key: 'tanggalSk', label: 'Tanggal SK', sortable: true },
];

const exporting = ref(false);
const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await pembimbingTaSkripsiApi.exportExcel();
    downloadBlob(blob, 'pembimbing-ta-skripsi.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh data'));
  } finally {
    exporting.value = false;
  }
};

interface FormState {
  dosenId: number | '';
  noSk: string;
  tanggalSk: string;
  pembimbingKe: PembimbingKe | '';
  periodeMulai: string;
  periodeSelesai: string;
}

const emptyForm = (): FormState => ({
  dosenId: '',
  noSk: '',
  tanggalSk: '',
  pembimbingKe: 'UTAMA',
  periodeMulai: '',
  periodeSelesai: '',
});

const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    Object.assign(form, emptyForm());
    if (editing) {
      const item = editing as PembimbingTaSkripsi;
      form.dosenId = item.dosenId;
      form.noSk = item.noSk ?? '';
      form.tanggalSk = item.tanggalSk?.slice(0, 10) ?? '';
      form.pembimbingKe = item.pembimbingKe;
      form.periodeMulai = item.periodeMulai?.slice(0, 10) ?? '';
      form.periodeSelesai = item.periodeSelesai?.slice(0, 10) ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.dosenId) errors.dosenId = 'Dosen wajib dipilih';
  if (!form.pembimbingKe) errors.pembimbingKe = 'Pembimbing Ke wajib dipilih';
  if (!form.periodeMulai) errors.periodeMulai = 'Periode mulai wajib diisi';
  if (!form.periodeSelesai) errors.periodeSelesai = 'Periode selesai wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PembimbingTaSkripsiPayload = {
      dosenId: Number(form.dosenId),
      noSk: form.noSk.trim() || null,
      tanggalSk: form.tanggalSk || null,
      pembimbingKe: form.pembimbingKe as PembimbingKe,
      periodeMulai: form.periodeMulai,
      periodeSelesai: form.periodeSelesai,
    };
    if (editingItem.value) {
      await pembimbingTaSkripsiApi.update(editingItem.value.id, payload);
    } else {
      await pembimbingTaSkripsiApi.create(payload);
    }
    onSaved();
    loadPeriodeOptions();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Pembimbing Tugas Akhir/Karya Ilmiah/Skripsi" subtitle="Penugasan (SK) dosen pembimbing tugas akhir/skripsi per periode.">
      <template #actions>
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
        <AppButton icon="download" variant="secondary" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Menyiapkan file...' : 'Export Data' }}
        </AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-80">
          <SelectInput v-model="selectedPeriode" placeholder="-- Semua Periode --" :options="periodeOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Pembimbing Tugas Akhir/Karya Ilmiah/Skripsi
      </div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari nama dosen atau no. SK..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data pembimbing TA/skripsi"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-namaDosen="{ item }">{{ item.dosen?.namaLengkap ?? '-' }}</template>
        <template #cell-noSk="{ item }">{{ item.noSk || '-' }}</template>
        <template #cell-pemb="{ item }">
          <StatusBadge :label="pembimbingKeLabel(item.pembimbingKe)" :variant="item.pembimbingKe === 'UTAMA' ? 'success' : 'neutral'" />
        </template>
        <template #cell-totalBimbingan="{ item }">{{ item.totalBimbingan }}</template>
        <template #cell-periode="{ item }">{{ formatDate(item.periodeMulai) }} s/d {{ formatDate(item.periodeSelesai) }}</template>
        <template #cell-tanggalSk="{ item }">{{ item.tanggalSk ? formatDate(item.tanggalSk) : '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="`Form Input Data Master Pembimbing Tugas Akhir/Karya Ilmiah/Skripsi`"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.noSk" label="No. SK" />
          <DateInput v-model="form.tanggalSk" label="Tanggal SK" />
        </div>
        <SelectInput
          v-model="form.dosenId"
          label="Dosen Pembimbing"
          required
          :error="errors.dosenId"
          :disabled="loadingDosen"
          placeholder="Pilih dosen..."
          :options="dosenOptions"
        />
        <SelectInput
          v-model="form.pembimbingKe"
          label="Pembimbing Ke"
          required
          :error="errors.pembimbingKe"
          :options="PEMBIMBING_KE_OPTIONS"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.periodeMulai" label="Periode Mulai" required :error="errors.periodeMulai" />
          <DateInput v-model="form.periodeSelesai" label="Periode Selesai" required :error="errors.periodeSelesai" />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembimbing TA/Skripsi"
      :message="`Yakin ingin menghapus data pembimbing ${deleteTarget?.dosen?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
