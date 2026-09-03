<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { tarifLainApi, type TarifLainPayload } from '@/api/tarifLain';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { TarifLain } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT);

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
} = useCrudPage<TarifLain>({
  fetchList: tarifLainApi.list,
  remove: tarifLainApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'kodeBiaya', label: 'Kode Biaya', sortable: true },
  { key: 'tahunAkademik', label: 'Tahun Akademik' },
  { key: 'tahunMasuk', label: 'Tahun Masuk', sortable: true },
  { key: 'biaya', label: 'Biaya', align: 'right', sortable: true },
  { key: 'keterangan', label: 'Keterangan' },
  { key: 'status', label: 'Status', align: 'center' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  kodeBiaya: string;
  tahunMasuk: number | '';
  biaya: number | null;
  keterangan: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  kodeBiaya: '',
  tahunMasuk: '',
  biaya: null,
  keterangan: '',
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
      form.kodeBiaya = editing.kodeBiaya;
      form.tahunMasuk = editing.tahunMasuk;
      form.biaya = editing.biaya;
      form.keterangan = editing.keterangan ?? '';
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

const onBiayaInput = (event: Event) => {
  form.biaya = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kodeBiaya.trim()) errors.kodeBiaya = 'Kode biaya wajib diisi';
  if (!form.tahunMasuk) errors.tahunMasuk = 'Tahun angkatan wajib diisi';
  if (!form.biaya || form.biaya <= 0) errors.biaya = 'Biaya wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: TarifLainPayload = {
      kodeBiaya: form.kodeBiaya.trim(),
      tahunMasuk: Number(form.tahunMasuk),
      biaya: Number(form.biaya),
      keterangan: form.keterangan.trim() || null,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await tarifLainApi.update(editingItem.value.id, payload);
    } else {
      await tarifLainApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data tarif lain');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Tarif Lain" subtitle="Master tarif biaya lain-lain (sertifikasi, pelatihan, dll).">
      <template #actions>
        <ImportExportButtons
          :export-fn="tarifLainApi.exportExcel"
          :import-fn="tarifLainApi.importExcel"
          :template-fn="tarifLainApi.importTemplate"
          :can-import="canCreate"
          filename="tarif-lain.xlsx"
          template-filename="template-import-tarif-lain.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Tarif Lain</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari kode biaya atau keterangan..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data tarif lain"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-tahunAkademik="{ item }">{{ item.tahunAkademik ?? '-' }}</template>
        <template #cell-biaya="{ item }">{{ formatCurrencyIdr(item.biaya) }}</template>
        <template #cell-keterangan="{ item }">{{ item.keterangan || '-' }}</template>
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
      title="Form Input Data Master Tarif Lain"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.kodeBiaya" label="Kode Biaya" required placeholder="mis. SAP" :error="errors.kodeBiaya" />
        <TextInput
          v-model.number="form.tahunMasuk"
          label="Tahun Angkatan"
          type="number"
          required
          placeholder="mis. 2025"
          :error="errors.tahunMasuk"
        />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Biaya<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.biaya)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.biaya
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onBiayaInput"
          />
          <p v-if="errors.biaya" class="mt-1 text-label-sm text-error">{{ errors.biaya }}</p>
        </label>
        <TextInput v-model="form.keterangan" label="Keterangan" placeholder="mis. SAP Overview" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tarif Lain"
      :message="`Yakin ingin menghapus tarif lain ${deleteTarget?.kodeBiaya ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
