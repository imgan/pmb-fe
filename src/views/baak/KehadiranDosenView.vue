<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { kehadiranDosenApi, type KehadiranDosenPayload } from '@/api/kehadiranDosen';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { formatDate, toDateInputValue } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { StatusKehadiranDosen } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEHADIRAN_DOSEN_MANAGEMENT);

const STATUS_OPTIONS: { value: StatusKehadiranDosen; label: string }[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'TIDAK_HADIR', label: 'Tidak Hadir' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
];
const statusLabel = (status: StatusKehadiranDosen) => STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
const STATUS_VARIANTS: Record<StatusKehadiranDosen, 'success' | 'warning' | 'danger' | 'neutral'> = {
  HADIR: 'success',
  TIDAK_HADIR: 'danger',
  IZIN: 'warning',
  SAKIT: 'warning',
};
const statusVariant = (status: StatusKehadiranDosen): 'success' | 'warning' | 'danger' | 'neutral' =>
  STATUS_VARIANTS[status] ?? 'neutral';

const programOptions = ref<{ value: string; label: string }[]>([]);
const selectedProgram = ref('');
const appliedProgram = ref('');

const jadwalOptions = ref<{ value: number; label: string }[]>([]);
const dosenOptions = ref<{ value: number; label: string }[]>([]);

onMounted(async () => {
  try {
    const kelasList = await jadwalKuliahApi.kelasOptions();
    programOptions.value = kelasList.map((k) => ({ value: k, label: k }));
  } catch {
    programOptions.value = [];
  }
  const [jadwalResult, dosenResult] = await Promise.all([
    jadwalKuliahApi.list({ limit: 200 }),
    dosenApi.list({ limit: 200 }),
  ]);
  jadwalOptions.value = jadwalResult.data.map((j) => ({ value: j.id, label: `${j.kelas} - ${j.kodeMataKuliah} - ${j.namaMataKuliah}` }));
  dosenOptions.value = dosenResult.data.map((d) => ({ value: d.id, label: d.namaLengkap }));
});

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
  fetchList: kehadiranDosenApi.list,
  remove: kehadiranDosenApi.remove,
  extraQuery: () => ({ kelas: appliedProgram.value || undefined }),
});

fetchItems();

const handlePeriksa = () => {
  appliedProgram.value = selectedProgram.value;
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'dosen', label: 'Dosen', sortable: true },
  { key: 'tanggalRealisasi', label: 'Realisasi', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
  { key: 'mataKuliah', label: 'Mata Kuliah' },
  { key: 'kelas', label: 'Kelas' },
];

interface FormState {
  jadwalKuliahId: number | '';
  dosenId: number | '';
  tanggalRealisasi: string;
  status: StatusKehadiranDosen;
  uraian: string;
  keterangan: string;
}

const emptyForm = (): FormState => ({
  jadwalKuliahId: '',
  dosenId: '',
  tanggalRealisasi: '',
  status: 'HADIR',
  uraian: '',
  keterangan: '',
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
      form.jadwalKuliahId = editing.jadwalKuliahId;
      form.dosenId = editing.dosenId;
      form.tanggalRealisasi = toDateInputValue(editing.tanggalRealisasi);
      form.status = editing.status;
      form.uraian = editing.uraian ?? '';
      form.keterangan = editing.keterangan ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.jadwalKuliahId) errors.jadwalKuliahId = 'Jadwal kuliah wajib dipilih';
  if (!form.dosenId) errors.dosenId = 'Dosen wajib dipilih';
  if (!form.tanggalRealisasi) errors.tanggalRealisasi = 'Tanggal realisasi wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: KehadiranDosenPayload = {
      jadwalKuliahId: Number(form.jadwalKuliahId),
      dosenId: Number(form.dosenId),
      tanggalRealisasi: form.tanggalRealisasi,
      status: form.status,
      uraian: form.uraian.trim() || null,
      keterangan: form.keterangan.trim() || null,
    };
    if (editingItem.value) {
      await kehadiranDosenApi.update(editingItem.value.id, payload);
    } else {
      await kehadiranDosenApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan kehadiran dosen');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Monitoring Kehadiran Dosen" subtitle="Realisasi kehadiran mengajar dosen per sesi jadwal kuliah.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedProgram" placeholder="-- Pilih Program --" :options="programOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedProgram ? `Data Master Monitoring Kehadiran Dosen - Kelas ${appliedProgram}` : 'Semua Data Master Monitoring Kehadiran Dosen' }}
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-end gap-3">
        <div class="w-full md:w-72">
          <SearchInput v-model="search" placeholder="Cari dosen atau mata kuliah..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data kehadiran dosen"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-dosen="{ item }">{{ item.dosen?.namaLengkap ?? '-' }}</template>
        <template #cell-tanggalRealisasi="{ item }">{{ formatDate(item.tanggalRealisasi) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusLabel(item.status)" :variant="statusVariant(item.status)" />
        </template>
        <template #cell-mataKuliah="{ item }">{{ item.jadwalKuliah?.namaMataKuliah ?? '-' }}</template>
        <template #cell-kelas="{ item }">{{ item.jadwalKuliah?.kelas ?? '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Kehadiran Dosen' : 'Tambah Kehadiran Dosen'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.jadwalKuliahId"
          label="Jadwal Kuliah"
          required
          placeholder="Pilih kelas - mata kuliah..."
          :options="jadwalOptions"
          :error="errors.jadwalKuliahId"
        />
        <SelectInput
          v-model="form.dosenId"
          label="Dosen"
          required
          placeholder="Pilih dosen..."
          :options="dosenOptions"
          :error="errors.dosenId"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalRealisasi" label="Tanggal Realisasi" required :error="errors.tanggalRealisasi" />
          <SelectInput v-model="form.status" label="Status" :options="STATUS_OPTIONS" />
        </div>
        <TextareaInput v-model="form.uraian" label="Uraian Materi (Pokok Bahasan)" :rows="3" />
        <TextareaInput v-model="form.keterangan" label="Rincian Materi" :rows="3" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Kehadiran Dosen"
      :message="`Yakin ingin menghapus data kehadiran ${deleteTarget?.dosen?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
