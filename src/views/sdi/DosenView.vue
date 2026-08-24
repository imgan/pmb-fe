<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { toDateInputValue } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { DosenStatItem, KelompokFakultas } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.DOSEN_MANAGEMENT);

const KELOMPOK_OPTIONS: { value: KelompokFakultas; label: string }[] = [
  { value: 'FKF', label: 'FKF' },
  { value: 'FTID', label: 'FTID' },
  { value: 'FIP', label: 'FIP' },
  { value: 'NON_BASE', label: 'Non Base' },
];

const STAT_STYLE: Record<KelompokFakultas, string> = {
  FKF: 'bg-[#1a5f9e]',
  FTID: 'bg-[#c9a83c]',
  FIP: 'bg-[#9c1c4c]',
  NON_BASE: 'bg-[#5b6472]',
};

const stats = ref<DosenStatItem[]>([]);
const loadStats = async () => {
  stats.value = await dosenApi.stats();
};
const statTotal = (kelompok: KelompokFakultas) => stats.value.find((s) => s.kelompokFakultas === kelompok)?.total ?? 0;

const kelompokFilter = ref<KelompokFakultas | ''>('');

const {
  items,
  meta,
  page,
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
  fetchList: dosenApi.list,
  remove: dosenApi.remove,
  extraQuery: () => ({ kelompokFakultas: kelompokFilter.value || undefined }),
});

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const refreshAll = () => Promise.all([fetchItems(), loadStats()]);
refreshAll();

const columns: DataTableColumn[] = [
  { key: 'nidn', label: 'NIDN', sortable: true },
  { key: 'namaLengkap', label: 'Nama Lengkap', sortable: true },
  { key: 'kelompokFakultas', label: 'Kelompok' },
  { key: 'jenisKelamin', label: 'JK', align: 'center' },
  { key: 'usia', label: 'Usia', align: 'center' },
  { key: 'statusDosen', label: 'Status Dosen' },
  { key: 'isActive', label: 'Status', align: 'center' },
];

const calcAge = (tanggalLahir: string | null): string => {
  if (!tanggalLahir) return '-';
  const birth = new Date(tanggalLahir);
  if (Number.isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return String(age);
};

const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map((v) => ({ value: v, label: v }));
const PENDIDIKAN_OPTIONS = ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'].map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = ['INSTITUSI', 'YAYASAN'].map((v) => ({ value: v, label: v }));

const form = reactive({
  nik: '' as string,
  nidn: '',
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '' as 'L' | 'P' | '',
  pendidikanAkhir: '',
  agama: '',
  telpHp: '',
  email: '',
  alamat: '',
  statusDosen: '' as 'TETAP' | 'TIDAK_TETAP' | '',
  status: '',
  waktu: '' as 'M' | 'P' | '',
  tmt: '',
  karyawanInternal: false,
  infaq: false,
  kelompokFakultas: '' as KelompokFakultas | '',
});
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.nik = editing?.nik ?? '';
    form.nidn = editing?.nidn ?? '';
    form.namaLengkap = editing?.namaLengkap ?? '';
    form.tempatLahir = editing?.tempatLahir ?? '';
    form.tanggalLahir = toDateInputValue(editing?.tanggalLahir);
    form.jenisKelamin = editing?.jenisKelamin ?? '';
    form.pendidikanAkhir = editing?.pendidikanAkhir ?? '';
    form.agama = editing?.agama ?? '';
    form.telpHp = editing?.telpHp ?? '';
    form.email = editing?.email ?? '';
    form.alamat = editing?.alamat ?? '';
    form.statusDosen = editing?.statusDosen ?? '';
    form.status = editing?.status ?? '';
    form.waktu = editing?.waktu ?? '';
    form.tmt = toDateInputValue(editing?.tmt);
    form.karyawanInternal = editing?.karyawanInternal ?? false;
    form.infaq = editing?.infaq ?? false;
    form.kelompokFakultas = editing?.kelompokFakultas ?? '';
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nidn.trim()) errors.nidn = 'NIDN wajib diisi';
  if (!form.namaLengkap.trim()) errors.namaLengkap = 'Nama lengkap wajib diisi';
  if (!form.kelompokFakultas) errors.kelompokFakultas = 'Kelompok wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      nik: form.nik.trim() || null,
      nidn: form.nidn.trim(),
      namaLengkap: form.namaLengkap.trim(),
      tempatLahir: form.tempatLahir.trim() || null,
      tanggalLahir: form.tanggalLahir || null,
      jenisKelamin: form.jenisKelamin || null,
      pendidikanAkhir: form.pendidikanAkhir || null,
      agama: form.agama || null,
      telpHp: form.telpHp.trim() || null,
      email: form.email.trim() || null,
      alamat: form.alamat.trim() || null,
      statusDosen: form.statusDosen || null,
      status: form.status || null,
      waktu: form.waktu || null,
      tmt: form.tmt || null,
      karyawanInternal: form.karyawanInternal,
      infaq: form.infaq,
      kelompokFakultas: form.kelompokFakultas as KelompokFakultas,
    };
    if (editingItem.value) {
      await dosenApi.update(editingItem.value.id, payload);
    } else {
      await dosenApi.create(payload);
    }
    onSaved();
    loadStats();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan dosen');
  } finally {
    submitting.value = false;
  }
};

const handleDeleted = async () => {
  await confirmDelete();
  loadStats();
};
</script>

<template>
  <div>
    <PageHeader title="Master Biodata Dosen" subtitle="Kelola data dosen di lingkungan SDI.">
      <template #actions>
        <ImportExportButtons
          :export-fn="dosenApi.exportExcel"
          :import-fn="dosenApi.importExcel"
          :template-fn="dosenApi.importTemplate"
          :can-import="canCreate"
          filename="dosen.xlsx"
          template-filename="template-import-dosen.xlsx"
          @imported="refreshAll"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Dosen</AppButton>
      </template>
    </PageHeader>

    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div v-for="opt in KELOMPOK_OPTIONS" :key="opt.value" class="rounded-lg p-4 text-on-primary" :class="STAT_STYLE[opt.value]">
        <p class="font-bold text-display-lg">{{ statTotal(opt.value) }}</p>
        <p class="text-label-md opacity-90">{{ opt.label }}</p>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari nama, NIDN, atau NIK..." />
        <div class="w-full md:w-52">
          <SelectInput
            v-model="kelompokFilter"
            placeholder="Semua Kelompok"
            :options="KELOMPOK_OPTIONS"
            @change="onFilterChange"
          />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-kelompokFakultas="{ item }">{{ KELOMPOK_OPTIONS.find((o) => o.value === item.kelompokFakultas)?.label ?? '-' }}</template>
        <template #cell-jenisKelamin="{ item }">{{ item.jenisKelamin ?? '-' }}</template>
        <template #cell-usia="{ item }">{{ calcAge(item.tanggalLahir) }}</template>
        <template #cell-statusDosen="{ item }">{{ item.statusDosen === 'TETAP' ? 'Tetap' : item.statusDosen === 'TIDAK_TETAP' ? 'Tidak Tetap' : '-' }}</template>
        <template #cell-isActive="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'neutral'" :label="item.isActive ? 'Aktif' : 'Non-aktif'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" size="lg" :title="editingItem ? 'Ubah Biodata Dosen' : 'Form Tambah Master Biodata Dosen'" @update:model-value="closeForm">
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="md:col-span-2 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <TextInput v-model="form.nik" label="NIK" placeholder="Contoh: D001" />
        <TextInput v-model="form.nidn" label="NIDN" required :error="errors.nidn" />
        <TextInput v-model="form.namaLengkap" label="Nama Lengkap" required class="md:col-span-2" :error="errors.namaLengkap" />
        <TextInput v-model="form.tempatLahir" label="Tempat Lahir" />
        <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" />
        <SelectInput
          v-model="form.jenisKelamin"
          label="Jenis Kelamin"
          placeholder="--Pilih Jenis Kelamin--"
          :options="[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]"
        />
        <SelectInput v-model="form.pendidikanAkhir" label="Pendidikan Akhir" placeholder="--Pilih Pendidikan Akhir--" :options="PENDIDIKAN_OPTIONS" />
        <SelectInput v-model="form.agama" label="Agama" placeholder="--Agama--" :options="AGAMA_OPTIONS" />
        <TextInput v-model="form.telpHp" label="Telp/HP" />
        <TextInput v-model="form.email" type="email" label="Email" />
        <TextareaInput v-model="form.alamat" label="Alamat" class="md:col-span-2" :rows="3" />
        <SelectInput
          v-model="form.statusDosen"
          label="Status Dosen"
          placeholder="--Pilih Status Dosen--"
          :options="[{ value: 'TETAP', label: 'Tetap' }, { value: 'TIDAK_TETAP', label: 'Tidak Tetap' }]"
        />
        <SelectInput v-model="form.status" label="Status" placeholder="--Pilih Status--" :options="STATUS_OPTIONS" />
        <SelectInput
          v-model="form.waktu"
          label="Waktu"
          placeholder="--Pilih Waktu--"
          :options="[{ value: 'M', label: 'M' }, { value: 'P', label: 'P' }]"
        />
        <DateInput v-model="form.tmt" label="TMT" />
        <SelectInput
          v-model="form.kelompokFakultas"
          label="Kelompok"
          required
          placeholder="--Pilih Kelompok--"
          :options="KELOMPOK_OPTIONS"
          :error="errors.kelompokFakultas"
        />
        <CheckboxToggle v-model="form.karyawanInternal" label="Karyawan Internal" />
        <CheckboxToggle v-model="form.infaq" label="Infaq" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Dosen"
      :message="`Yakin ingin menghapus dosen ${deleteTarget?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="handleDeleted"
      @cancel="cancelDelete"
    />
  </div>
</template>
