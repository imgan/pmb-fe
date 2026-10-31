<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
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
import { tarifPembimbingApi, type TarifPembimbingPayload } from '@/api/tarifPembimbing';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { TarifPembimbing } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT);

const jurusanOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const result = await jurusanApi.list({ limit: 200 });
  jurusanOptions.value = result.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
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
} = useCrudPage<TarifPembimbing>({
  fetchList: tarifPembimbingApi.list,
  remove: tarifPembimbingApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'periode', label: 'Periode', sortable: true },
  { key: 'jurusan', label: 'Prodi', sortable: true },
  { key: 'biayaPembimbingUtama', label: 'Pembimbing Utama', align: 'right', sortable: true },
  { key: 'biayaPembimbingPendamping', label: 'Pembimbing Pendamping', align: 'right', sortable: true },
  { key: 'biayaPembimbingAsisten', label: 'Pembimbing Asisten', align: 'right', sortable: true },
  { key: 'biayaPembimbingTunggal', label: 'Tunggal', align: 'right', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  periode: number | '';
  jurusanId: number | '';
  biayaPembimbingUtama: number | null;
  biayaPembimbingPendamping: number | null;
  biayaPembimbingAsisten: number | null;
  biayaPembimbingTunggal: number | null;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  periode: '',
  jurusanId: '',
  biayaPembimbingUtama: null,
  biayaPembimbingPendamping: 0,
  biayaPembimbingAsisten: 0,
  biayaPembimbingTunggal: 0,
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
      form.biayaPembimbingUtama = editing.biayaPembimbingUtama;
      form.biayaPembimbingPendamping = editing.biayaPembimbingPendamping;
      form.biayaPembimbingAsisten = editing.biayaPembimbingAsisten;
      form.biayaPembimbingTunggal = editing.biayaPembimbingTunggal;
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

const onBiayaInput =
  (field: 'biayaPembimbingUtama' | 'biayaPembimbingPendamping' | 'biayaPembimbingAsisten' | 'biayaPembimbingTunggal') =>
  (event: Event) => {
    form[field] = parseRupiahInput((event.target as HTMLInputElement).value);
  };

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.periode) errors.periode = 'Periode wajib diisi';
  if (!form.jurusanId) errors.jurusanId = 'Prodi wajib dipilih';
  if (!form.biayaPembimbingUtama || form.biayaPembimbingUtama <= 0) {
    errors.biayaPembimbingUtama = 'Biaya pembimbing utama wajib diisi';
  }
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: TarifPembimbingPayload = {
      periode: Number(form.periode),
      jurusanId: Number(form.jurusanId),
      biayaPembimbingUtama: Number(form.biayaPembimbingUtama),
      biayaPembimbingPendamping: Number(form.biayaPembimbingPendamping) || 0,
      biayaPembimbingAsisten: Number(form.biayaPembimbingAsisten) || 0,
      biayaPembimbingTunggal: Number(form.biayaPembimbingTunggal) || 0,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await tarifPembimbingApi.update(editingItem.value.id, payload);
    } else {
      await tarifPembimbingApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data tarif pembimbing');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Tarif Pembimbing" subtitle="Master tarif honor dosen pembimbing per periode dan prodi.">
      <template #actions>
        <ImportExportButtons
          :export-fn="tarifPembimbingApi.exportExcel"
          :import-fn="tarifPembimbingApi.importExcel"
          :template-fn="tarifPembimbingApi.importTemplate"
          :can-import="canCreate"
          filename="tarif-pembimbing.xlsx"
          template-filename="template-import-tarif-pembimbing.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Tarif Pembimbing</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari prodi..." />
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
        empty-message="Belum ada data tarif pembimbing"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-biayaPembimbingUtama="{ item }">{{ formatCurrencyIdr(item.biayaPembimbingUtama) }}</template>
        <template #cell-biayaPembimbingPendamping="{ item }">
          {{ formatCurrencyIdr(item.biayaPembimbingPendamping) }}
        </template>
        <template #cell-biayaPembimbingAsisten="{ item }">{{ formatCurrencyIdr(item.biayaPembimbingAsisten) }}</template>
        <template #cell-biayaPembimbingTunggal="{ item }">{{ formatCurrencyIdr(item.biayaPembimbingTunggal) }}</template>
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
      :title="editingItem ? 'Ubah Tarif Pembimbing' : 'Tambah Tarif Pembimbing'"
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
            Biaya Pembimbing Utama<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.biayaPembimbingUtama)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.biayaPembimbingUtama
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onBiayaInput('biayaPembimbingUtama')($event)"
          />
          <p v-if="errors.biayaPembimbingUtama" class="mt-1 text-label-sm text-error">{{ errors.biayaPembimbingUtama }}</p>
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Biaya Pembimbing Pendamping</span>
          <input
            :value="formatCurrencyInputIdr(form.biayaPembimbingPendamping)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onBiayaInput('biayaPembimbingPendamping')($event)"
          />
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Biaya Pembimbing Asisten</span>
          <input
            :value="formatCurrencyInputIdr(form.biayaPembimbingAsisten)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onBiayaInput('biayaPembimbingAsisten')($event)"
          />
        </label>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Biaya Pembimbing Tunggal</span>
          <input
            :value="formatCurrencyInputIdr(form.biayaPembimbingTunggal)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            @input="onBiayaInput('biayaPembimbingTunggal')($event)"
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
      title="Hapus Tarif Pembimbing"
      :message="`Yakin ingin menghapus tarif pembimbing ${deleteTarget?.jurusan?.namaJurusan ?? ''} periode ${deleteTarget?.periode ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
