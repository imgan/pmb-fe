<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { jadwalKuliahApi, type JadwalKuliahPayload } from '@/api/jadwalKuliah';
import { dosenApi } from '@/api/dosen';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { HariKuliah } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.JADWAL_KULIAH_MANAGEMENT);

const dosenOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranAktifOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const [dosenResult, tahunAjaranResult] = await Promise.all([
    dosenApi.list({ limit: 200 }),
    tahunAjaranApi.list({ limit: 100, isActive: true }),
  ]);
  dosenOptions.value = dosenResult.data.map((d) => ({ value: d.id, label: d.namaLengkap }));
  tahunAjaranAktifOptions.value = tahunAjaranResult.data.map((t) => ({ value: t.id, label: t.nama }));
});

const HARI_OPTIONS: { value: HariKuliah; label: string }[] = [
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
];

const statusFilter = ref<'' | 'true' | 'false'>('');
const statusFilterOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' },
];

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
  fetchList: jadwalKuliahApi.list,
  remove: jadwalKuliahApi.remove,
  extraQuery: () => ({ isActive: statusFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'kelas', label: 'Kelas', sortable: true },
  { key: 'kodeMataKuliah', label: 'Kode Mata Kuliah', sortable: true },
  { key: 'namaMataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'tahunAjaran', label: 'Tahun Ajaran' },
  { key: 'dosenKordinator', label: 'Dosen Kordinator', sortable: true },
  { key: 'dosenPengampu', label: 'Dosen Pengampu' },
  { key: 'hari', label: 'Hari' },
  { key: 'jam', label: 'Jam', align: 'center', sortable: true },
  { key: 'ruangan', label: 'Ruangan', sortable: true },
  { key: 'gcr', label: 'GCR' },
  { key: 'status', label: 'Status', align: 'center' },
];

const hariLabel = (hari: HariKuliah[] | null) => {
  if (!hari || hari.length === 0) return '-';
  return hari.map((h) => HARI_OPTIONS.find((o) => o.value === h)?.label ?? h).join(', ');
};

interface JadwalKuliahFormState {
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | '';
  dosenKordinatorId: number | '';
  tahunAjaranId: number | '';
  dosenPengampuIds: number[];
  hari: HariKuliah[];
  jam: number | '';
  ruangan: string;
  gcr: string;
  isActive: boolean;
}

const emptyForm = (): JadwalKuliahFormState => ({
  kelas: '',
  kodeMataKuliah: '',
  namaMataKuliah: '',
  sks: '',
  dosenKordinatorId: '',
  tahunAjaranId: '',
  dosenPengampuIds: [],
  hari: [],
  jam: '',
  ruangan: '',
  gcr: '',
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
      form.kelas = editing.kelas;
      form.kodeMataKuliah = editing.kodeMataKuliah;
      form.namaMataKuliah = editing.namaMataKuliah;
      form.sks = editing.sks ?? '';
      form.dosenKordinatorId = editing.dosenKordinatorId;
      form.tahunAjaranId = editing.tahunAjaranId ?? '';
      form.dosenPengampuIds = editing.dosenPengampu?.map((d) => d.id) ?? [];
      form.hari = editing.hari ?? [];
      form.jam = editing.jam ?? '';
      form.ruangan = editing.ruangan ?? '';
      form.gcr = editing.gcr ?? '';
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

const togglePengampu = (dosenId: number) => {
  const idx = form.dosenPengampuIds.indexOf(dosenId);
  if (idx === -1) form.dosenPengampuIds.push(dosenId);
  else form.dosenPengampuIds.splice(idx, 1);
};

const toggleHari = (hari: HariKuliah) => {
  const idx = form.hari.indexOf(hari);
  if (idx === -1) form.hari.push(hari);
  else form.hari.splice(idx, 1);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kelas.trim()) errors.kelas = 'Kelas wajib diisi';
  if (!form.kodeMataKuliah.trim()) errors.kodeMataKuliah = 'Kode mata kuliah wajib diisi';
  if (!form.namaMataKuliah.trim()) errors.namaMataKuliah = 'Mata kuliah wajib diisi';
  if (!form.dosenKordinatorId) errors.dosenKordinatorId = 'Dosen kordinator wajib dipilih';
  if (!form.tahunAjaranId) errors.tahunAjaranId = 'Tahun ajaran wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: JadwalKuliahPayload = {
      kelas: form.kelas.trim(),
      kodeMataKuliah: form.kodeMataKuliah.trim(),
      namaMataKuliah: form.namaMataKuliah.trim(),
      sks: form.sks === '' ? null : Number(form.sks),
      dosenKordinatorId: Number(form.dosenKordinatorId),
      tahunAjaranId: Number(form.tahunAjaranId),
      dosenPengampuIds: form.dosenPengampuIds,
      hari: form.hari.length ? form.hari : null,
      jam: form.jam === '' ? null : Number(form.jam),
      ruangan: form.ruangan.trim() || null,
      gcr: form.gcr.trim() || null,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await jadwalKuliahApi.update(editingItem.value.id, payload);
    } else {
      await jadwalKuliahApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan jadwal kuliah');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Jadwal Kuliah" subtitle="Kelola jadwal perkuliahan per kelas dan mata kuliah.">
      <template #actions>
        <ImportExportButtons
          :export-fn="jadwalKuliahApi.exportExcel"
          :import-fn="jadwalKuliahApi.importExcel"
          :template-fn="jadwalKuliahApi.importTemplate"
          :can-import="canCreate"
          filename="jadwal-kuliah.xlsx"
          template-filename="template-import-jadwal-kuliah.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari kelas, kode, atau mata kuliah..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="statusFilterOptions" @change="onFilterChange" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data jadwal kuliah"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-namaMataKuliah="{ item }">
          {{ item.namaMataKuliah }}
          <span v-if="item.sks !== null" class="text-on-surface-variant">[ {{ item.sks }} ]</span>
        </template>
        <template #cell-tahunAjaran="{ item }">{{ item.tahunAjaran?.nama ?? '-' }}</template>
        <template #cell-dosenKordinator="{ item }">{{ item.dosenKordinator?.namaLengkap ?? '-' }}</template>
        <template #cell-dosenPengampu="{ item }">
          <template v-if="item.dosenPengampu && item.dosenPengampu.length">
            <p v-for="d in item.dosenPengampu" :key="d.id" class="whitespace-nowrap">{{ d.namaLengkap }}</p>
          </template>
          <span v-else>-</span>
        </template>
        <template #cell-hari="{ item }">{{ hariLabel(item.hari) }}</template>
        <template #cell-jam="{ item }">{{ item.jam ?? '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan || '-' }}</template>
        <template #cell-gcr="{ item }">{{ item.gcr || '-' }}</template>
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
      :title="editingItem ? 'Ubah Jadwal Kuliah' : 'Tambah Jadwal Kuliah'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.kelas" label="Kelas" required placeholder="mis. TI4AM" :error="errors.kelas" />
          <TextInput v-model.number="form.sks" label="SKS" type="number" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.kodeMataKuliah" label="Kode Mata Kuliah" required :error="errors.kodeMataKuliah" />
          <TextInput v-model="form.namaMataKuliah" label="Mata Kuliah" required :error="errors.namaMataKuliah" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="form.dosenKordinatorId"
            label="Dosen Kordinator"
            required
            placeholder="Pilih dosen kordinator..."
            :options="dosenOptions"
            :error="errors.dosenKordinatorId"
          />
          <SelectInput
            v-model="form.tahunAjaranId"
            label="Tahun Ajaran"
            required
            placeholder="Pilih tahun ajaran..."
            :options="tahunAjaranAktifOptions"
            :error="errors.tahunAjaranId"
          />
        </div>

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Dosen Pengampu</span>
          <div class="border border-outline-variant rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
            <label
              v-for="opt in dosenOptions"
              :key="opt.value"
              class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container cursor-pointer text-body-sm text-on-surface"
            >
              <input
                type="checkbox"
                :checked="form.dosenPengampuIds.includes(opt.value)"
                @change="togglePengampu(opt.value)"
              />
              {{ opt.label }}
            </label>
            <p v-if="dosenOptions.length === 0" class="text-body-sm text-on-surface-variant px-2 py-1.5">Belum ada data dosen</p>
          </div>
        </label>

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Hari</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in HARI_OPTIONS"
              :key="opt.value"
              type="button"
              class="px-3 py-1.5 rounded-full border text-label-sm transition-colors"
              :class="
                form.hari.includes(opt.value)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
              "
              @click="toggleHari(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </label>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.jam" label="Jam Ke-" type="number" />
          <TextInput v-model="form.ruangan" label="Ruangan" placeholder="mis. 4.01 A" />
        </div>
        <TextInput v-model="form.gcr" label="GCR" placeholder="Kode/tautan Google Classroom" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Jadwal Kuliah"
      :message="`Yakin ingin menghapus jadwal ${deleteTarget?.namaMataKuliah ?? ''} (${deleteTarget?.kelas ?? ''})?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
