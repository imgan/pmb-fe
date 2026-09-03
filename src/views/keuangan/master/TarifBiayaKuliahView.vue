<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import { tarifKuliahApi, type TarifKuliahPayload } from '@/api/tarifKuliah';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { StatusBelajarKuliah, TarifKuliah } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT);

const jurusanOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const result = await jurusanApi.list({ limit: 200 });
  jurusanOptions.value = result.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
});

const statusBelajarOptions: { value: StatusBelajarKuliah; label: string }[] = [
  { value: 'BARU', label: 'BARU' },
  { value: 'LAMA', label: 'LAMA' },
  { value: 'KARYAWAN', label: 'KARYAWAN' },
  { value: 'BARU KARYAWAN', label: 'BARU KARYAWAN' },
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
} = useCrudPage<TarifKuliah>({
  fetchList: tarifKuliahApi.list,
  remove: tarifKuliahApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'periode', label: 'Periode', sortable: false },
  { key: 'jurusan', label: 'Prodi', sortable: true },
  { key: 'tahunAngkatan', label: 'Tahun Angkatan', align: 'center', sortable: true },
  { key: 'semester', label: 'Semester', align: 'center', sortable: true },
  { key: 'biayaSks', label: 'Biaya SKS', align: 'right', sortable: true },
  { key: 'biayaBpp', label: 'Biaya BPP', align: 'right', sortable: true },
  { key: 'biayaSpp', label: 'Biaya SPP', align: 'right', sortable: true },
  { key: 'statusBelajar', label: 'Status Belajar', align: 'center', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  jurusanId: number | '';
  tahunAngkatan: number | '';
  semester: number | '';
  biayaSks: number | null;
  biayaBpp: number | null;
  biayaSpp: number | null;
  statusBelajar: StatusBelajarKuliah | '';
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  jurusanId: '',
  tahunAngkatan: '',
  semester: '',
  biayaSks: null,
  biayaBpp: 0,
  biayaSpp: 0,
  statusBelajar: '',
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
      form.jurusanId = editing.jurusanId;
      form.tahunAngkatan = editing.tahunAngkatan;
      form.semester = editing.semester;
      form.biayaSks = editing.biayaSks;
      form.biayaBpp = editing.biayaBpp;
      form.biayaSpp = editing.biayaSpp;
      form.statusBelajar = editing.statusBelajar;
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

const onBiayaInput = (field: 'biayaSks' | 'biayaBpp' | 'biayaSpp') => (event: Event) => {
  form[field] = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.jurusanId) errors.jurusanId = 'Prodi wajib dipilih';
  if (!form.tahunAngkatan) errors.tahunAngkatan = 'Tahun angkatan wajib diisi';
  if (!form.semester) errors.semester = 'Semester wajib diisi';
  if (!form.biayaSks || form.biayaSks <= 0) errors.biayaSks = 'Biaya SKS wajib diisi';
  if (!form.statusBelajar) errors.statusBelajar = 'Status belajar wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: TarifKuliahPayload = {
      jurusanId: Number(form.jurusanId),
      tahunAngkatan: Number(form.tahunAngkatan),
      semester: Number(form.semester),
      biayaSks: Number(form.biayaSks),
      biayaBpp: Number(form.biayaBpp) || 0,
      biayaSpp: Number(form.biayaSpp) || 0,
      statusBelajar: form.statusBelajar as StatusBelajarKuliah,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await tarifKuliahApi.update(editingItem.value.id, payload);
    } else {
      await tarifKuliahApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data tarif kuliah');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Tarif Kuliah" subtitle="Master tarif biaya kuliah per prodi, tahun angkatan, dan semester.">
      <template #actions>
        <ImportExportButtons
          :export-fn="tarifKuliahApi.exportExcel"
          :import-fn="tarifKuliahApi.importExcel"
          :template-fn="tarifKuliahApi.importTemplate"
          :can-import="canCreate"
          filename="tarif-kuliah.xlsx"
          template-filename="template-import-tarif-kuliah.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Tarif Kuliah</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari prodi..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data tarif kuliah"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-periode="{ item }">{{ item.periode ?? '-' }}</template>
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-biayaSks="{ item }">{{ formatCurrencyIdr(item.biayaSks) }}</template>
        <template #cell-biayaBpp="{ item }">{{ formatCurrencyIdr(item.biayaBpp) }}</template>
        <template #cell-biayaSpp="{ item }">{{ formatCurrencyIdr(item.biayaSpp) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="item.isActive ? 'A' : 'T'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Tarif Kuliah' : 'Tambah Tarif Kuliah'"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.jurusanId"
          label="Prodi"
          required
          placeholder="Pilih prodi..."
          :options="jurusanOptions"
          :error="errors.jurusanId"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            v-model.number="form.tahunAngkatan"
            label="Tahun Angkatan"
            type="number"
            required
            :error="errors.tahunAngkatan"
          />
          <TextInput v-model.number="form.semester" label="Semester" type="number" required :error="errors.semester" />
        </div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Biaya SKS<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.biayaSks)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.biayaSks
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onBiayaInput('biayaSks')"
          />
          <p v-if="errors.biayaSks" class="mt-1 text-label-sm text-error">{{ errors.biayaSks }}</p>
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Biaya BPP</span>
          <input
            :value="formatCurrencyInputIdr(form.biayaBpp)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onBiayaInput('biayaBpp')"
          />
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Biaya SPP</span>
          <input
            :value="formatCurrencyInputIdr(form.biayaSpp)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onBiayaInput('biayaSpp')"
          />
        </label>
        <SelectInput
          v-model="form.statusBelajar"
          label="Status Belajar"
          required
          placeholder="Pilih status belajar..."
          :options="statusBelajarOptions"
          :error="errors.statusBelajar"
        />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tarif Kuliah"
      :message="`Yakin ingin menghapus tarif kuliah ${deleteTarget?.jurusan?.namaJurusan ?? ''} tahun angkatan ${deleteTarget?.tahunAngkatan ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
