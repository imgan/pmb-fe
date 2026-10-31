<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { karyawanApi, type KaryawanPayload } from '@/api/karyawan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { KaryawanGenderSummary } from '@/types/entities';

// Halaman ini juga dipakai Modul Admin → Master, dengan kode menu Admin sebagai sumber hak akses.
const props = withDefaults(defineProps<{ menuCode?: string }>(), { menuCode: MENU.KARYAWAN_MANAGEMENT });
const { canCreate, canUpdate, canDelete } = usePermission(props.menuCode);

const genderSummary = ref<KaryawanGenderSummary>({ lakiLaki: 0, perempuan: 0 });
const loadGenderSummary = async () => {
  genderSummary.value = await karyawanApi.genderSummary();
};
onMounted(loadGenderSummary);

const statusFilter = ref<'' | 'true' | 'false'>('');
const statusFilterOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' },
];

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
  fetchList: karyawanApi.list,
  remove: karyawanApi.remove,
  extraQuery: () => ({ isActive: statusFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const handleSaved = () => {
  onSaved();
  loadGenderSummary();
};

const columns: DataTableColumn[] = [
  { key: 'nip', label: 'NIP', sortable: true },
  { key: 'namaLengkap', label: 'Nama Lengkap', sortable: true },
  { key: 'idFinger', label: 'ID-Finger', sortable: true },
  { key: 'bagian', label: 'Bagian', sortable: true },
  { key: 'jabatan', label: 'Jabatan', sortable: true },
  { key: 'usia', label: 'Usia', align: 'center' },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
];

const jenisKelaminOptions = [
  { value: 'L', label: 'Laki-Laki' },
  { value: 'P', label: 'Perempuan' },
];

const hitungUsia = (tanggalLahir: string | null): string => {
  if (!tanggalLahir) return '-';
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  let usia = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if (belumUlangTahun) usia -= 1;
  return `${usia} tahun`;
};

interface KaryawanFormState {
  nip: string;
  idFinger: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P' | '';
  pendidikanAkhir: string;
  agama: string;
  telpHp: string;
  email: string;
  alamat: string;
  bagian: string;
  jabatan: string;
  status: string;
  tmt: string;
  isActive: boolean;
}

const emptyForm = (): KaryawanFormState => ({
  nip: '',
  idFinger: '',
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '',
  pendidikanAkhir: '',
  agama: '',
  telpHp: '',
  email: '',
  alamat: '',
  bagian: '',
  jabatan: '',
  status: '',
  tmt: '',
  isActive: true,
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
      form.nip = editing.nip;
      form.idFinger = editing.idFinger ?? '';
      form.namaLengkap = editing.namaLengkap;
      form.tempatLahir = editing.tempatLahir ?? '';
      form.tanggalLahir = editing.tanggalLahir?.slice(0, 10) ?? '';
      form.jenisKelamin = editing.jenisKelamin ?? '';
      form.pendidikanAkhir = editing.pendidikanAkhir ?? '';
      form.agama = editing.agama ?? '';
      form.telpHp = editing.telpHp ?? '';
      form.email = editing.email ?? '';
      form.alamat = editing.alamat ?? '';
      form.bagian = editing.bagian ?? '';
      form.jabatan = editing.jabatan ?? '';
      form.status = editing.status ?? '';
      form.tmt = editing.tmt?.slice(0, 10) ?? '';
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nip.trim()) errors.nip = 'NIP wajib diisi';
  if (!form.namaLengkap.trim()) errors.namaLengkap = 'Nama lengkap wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: KaryawanPayload = {
      nip: form.nip.trim(),
      idFinger: form.idFinger?.trim() || null,
      namaLengkap: form.namaLengkap.trim(),
      tempatLahir: form.tempatLahir?.trim() || null,
      tanggalLahir: form.tanggalLahir || null,
      jenisKelamin: form.jenisKelamin || null,
      pendidikanAkhir: form.pendidikanAkhir?.trim() || null,
      agama: form.agama?.trim() || null,
      telpHp: form.telpHp?.trim() || null,
      email: form.email?.trim() || null,
      alamat: form.alamat?.trim() || null,
      bagian: form.bagian?.trim() || null,
      jabatan: form.jabatan?.trim() || null,
      status: form.status?.trim() || null,
      tmt: form.tmt || null,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await karyawanApi.update(editingItem.value.id, payload);
    } else {
      await karyawanApi.create(payload);
    }
    handleSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data karyawan');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Biodata Karyawan" subtitle="Data karyawan di lingkungan SDI.">
      <template #actions>
        <ImportExportButtons
          :export-fn="karyawanApi.exportExcel"
          :import-fn="karyawanApi.importExcel"
          :template-fn="karyawanApi.importTemplate"
          :can-import="canCreate"
          filename="karyawan.xlsx"
          template-filename="template-import-karyawan.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Karyawan</AppButton>
      </template>
    </PageHeader>

    <div class="flex flex-wrap gap-4 mb-6">
      <div class="rounded-lg bg-primary text-on-primary px-6 py-4 min-w-40">
        <p class="text-headline-lg font-bold">{{ genderSummary.lakiLaki }}</p>
        <p class="text-label-sm opacity-90">Laki-Laki</p>
      </div>
      <div class="rounded-lg bg-secondary-container text-on-secondary-container px-6 py-4 min-w-40">
        <p class="text-headline-lg font-bold">{{ genderSummary.perempuan }}</p>
        <p class="text-label-sm">Perempuan</p>
      </div>
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIP, nama, atau bagian..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="statusFilterOptions" @change="onFilterChange" />
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
        empty-message="Belum ada data karyawan"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-idFinger="{ item }">{{ item.idFinger || '-' }}</template>
        <template #cell-bagian="{ item }">{{ item.bagian || '-' }}</template>
        <template #cell-jabatan="{ item }">{{ item.jabatan || '-' }}</template>
        <template #cell-usia="{ item }">{{ hitungUsia(item.tanggalLahir) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Non-aktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Data Karyawan' : 'Tambah Karyawan'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.nip" label="NIP" required :error="errors.nip" />
          <TextInput v-model="form.idFinger" label="ID-Finger" />
        </div>
        <TextInput v-model="form.namaLengkap" label="Nama Lengkap" required :error="errors.namaLengkap" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.tempatLahir" label="Tempat Lahir" />
          <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.jenisKelamin" label="Jenis Kelamin" placeholder="Pilih..." :options="jenisKelaminOptions" />
          <TextInput v-model="form.agama" label="Agama" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.pendidikanAkhir" label="Pendidikan Akhir" placeholder="mis. S1" />
          <TextInput v-model="form.bagian" label="Bagian" placeholder="mis. Administrasi Umum" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.jabatan" label="Jabatan" placeholder="mis. Staff, Ka. Lab. Komputer" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.telpHp" label="No HP" />
          <TextInput v-model="form.email" label="Email" type="email" />
        </div>
        <TextareaInput v-model="form.alamat" label="Alamat" :rows="3" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.status" label="Status Kepegawaian" placeholder="mis. Tetap, Kontrak" />
          <DateInput v-model="form.tmt" label="TMT (Tanggal Mulai Tugas)" />
        </div>
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" description="Nonaktifkan jika karyawan sudah tidak bekerja" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Karyawan"
      :message="`Yakin ingin menghapus data karyawan ${deleteTarget?.namaLengkap ?? ''} (${deleteTarget?.nip ?? ''})?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
