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
import { tarifTaSkripsiApi, type TarifTaSkripsiPayload } from '@/api/tarifTaSkripsi';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { TarifTaSkripsi } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT);

const jurusanOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const result = await jurusanApi.list({ limit: 200 });
  jurusanOptions.value = result.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
});

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
} = useCrudPage<TarifTaSkripsi>({
  fetchList: tarifTaSkripsiApi.list,
  remove: tarifTaSkripsiApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'periode', label: 'Periode', sortable: true },
  { key: 'biayaPendaftaran', label: 'Biaya Pendaftaran', align: 'right', sortable: true },
  { key: 'jurusan', label: 'Prodi', sortable: true },
  { key: 'biayaPerpanjangan', label: 'Biaya Perpanjangan', align: 'right', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  periode: number | '';
  jurusanId: number | '';
  biayaPendaftaran: number | null;
  biayaPerpanjangan: number | null;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  periode: '',
  jurusanId: '',
  biayaPendaftaran: null,
  biayaPerpanjangan: 0,
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
      form.periode = editing.periode;
      form.jurusanId = editing.jurusanId;
      form.biayaPendaftaran = editing.biayaPendaftaran;
      form.biayaPerpanjangan = editing.biayaPerpanjangan;
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

const onBiayaInput = (field: 'biayaPendaftaran' | 'biayaPerpanjangan') => (event: Event) => {
  form[field] = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.periode) errors.periode = 'Periode wajib diisi';
  if (!form.jurusanId) errors.jurusanId = 'Prodi wajib dipilih';
  if (!form.biayaPendaftaran || form.biayaPendaftaran <= 0) errors.biayaPendaftaran = 'Biaya pendaftaran wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: TarifTaSkripsiPayload = {
      periode: Number(form.periode),
      jurusanId: Number(form.jurusanId),
      biayaPendaftaran: Number(form.biayaPendaftaran),
      biayaPerpanjangan: Number(form.biayaPerpanjangan) || 0,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await tarifTaSkripsiApi.update(editingItem.value.id, payload);
    } else {
      await tarifTaSkripsiApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data tarif TA/Skripsi');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Tarif TA/Skripsi" subtitle="Master tarif biaya tugas akhir/skripsi per periode dan prodi.">
      <template #actions>
        <ImportExportButtons
          :export-fn="tarifTaSkripsiApi.exportExcel"
          :import-fn="tarifTaSkripsiApi.importExcel"
          :template-fn="tarifTaSkripsiApi.importTemplate"
          :can-import="canCreate"
          filename="tarif-ta-skripsi.xlsx"
          template-filename="template-import-tarif-ta-skripsi.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Tarif TA/Skripsi</div>

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
        empty-message="Belum ada data tarif TA/Skripsi"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-biayaPendaftaran="{ item }">{{ formatCurrencyIdr(item.biayaPendaftaran) }}</template>
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-biayaPerpanjangan="{ item }">{{ formatCurrencyIdr(item.biayaPerpanjangan) }}</template>
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
      :title="editingItem ? 'Ubah Tarif TA/Skripsi' : 'Tambah Tarif TA/Skripsi'"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.periode" label="Periode" type="number" required :error="errors.periode" />
          <SelectInput
            v-model="form.jurusanId"
            label="Prodi"
            required
            placeholder="Pilih prodi..."
            :options="jurusanOptions"
            :error="errors.jurusanId"
          />
        </div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Biaya Pendaftaran<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.biayaPendaftaran)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.biayaPendaftaran
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onBiayaInput('biayaPendaftaran')"
          />
          <p v-if="errors.biayaPendaftaran" class="mt-1 text-label-sm text-error">{{ errors.biayaPendaftaran }}</p>
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Biaya Perpanjangan</span>
          <input
            :value="formatCurrencyInputIdr(form.biayaPerpanjangan)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onBiayaInput('biayaPerpanjangan')"
          />
        </label>
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tarif TA/Skripsi"
      :message="`Yakin ingin menghapus tarif TA/Skripsi ${deleteTarget?.jurusan?.namaJurusan ?? ''} periode ${deleteTarget?.periode ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
