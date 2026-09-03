<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { tunggakanMahasiswaApi, type TunggakanMahasiswaPayload } from '@/api/tunggakanMahasiswa';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { TunggakanMahasiswa } from '@/types/entities';

const mahasiswaOptions = ref<{ value: string; label: string }[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 500 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.nim, label: `${m.nim} - ${m.namaLengkap}` }));
});

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT);

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
} = useCrudPage<TunggakanMahasiswa>({
  fetchList: tunggakanMahasiswaApi.list,
  remove: tunggakanMahasiswaApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'tanggal', label: 'Pada Tanggal', sortable: true },
  { key: 'nominal', label: 'Nominal Tunggakan', align: 'right', sortable: true },
  { key: 'keterangan', label: 'Keterangan' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  nim: string;
  tanggal: string;
  nominal: number | null;
  keterangan: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  nim: '',
  tanggal: todayIso(),
  nominal: null,
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
      form.nim = editing.mahasiswa?.nim ?? '';
      form.tanggal = editing.tanggal.slice(0, 10);
      form.nominal = editing.nominal;
      form.keterangan = editing.keterangan ?? '';
    }
  },
  { immediate: true }
);

const onNominalInput = (event: Event) => {
  form.nominal = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'NIM wajib diisi';
  if (!form.tanggal) errors.tanggal = 'Tanggal wajib diisi';
  if (form.nominal === null || form.nominal < 0) errors.nominal = 'Nominal wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: TunggakanMahasiswaPayload = {
      nim: form.nim.trim(),
      tanggal: form.tanggal,
      nominal: Number(form.nominal),
      keterangan: form.keterangan.trim() || null,
    };
    if (editingItem.value) {
      await tunggakanMahasiswaApi.update(editingItem.value.id, payload);
    } else {
      await tunggakanMahasiswaApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data tunggakan mahasiswa');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Tunggakan Mahasiswa"
      subtitle="Saldo tunggakan pembayaran per mahasiswa — dicatat manual, terutama untuk import saldo awal dari sistem kampus lama."
    >
      <template #actions>
        <ImportExportButtons
          :export-fn="tunggakanMahasiswaApi.exportExcel"
          :import-fn="tunggakanMahasiswaApi.importExcel"
          :template-fn="tunggakanMahasiswaApi.importTemplate"
          :can-import="canCreate"
          filename="tunggakan-mahasiswa.xlsx"
          template-filename="template-import-tunggakan-mahasiswa.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Daftar Tunggakan Mahasiswa</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data tunggakan mahasiswa"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-tanggal="{ item }">{{ formatDate(item.tanggal) }}</template>
        <template #cell-nominal="{ item }">{{ formatCurrencyIdr(item.nominal) }}</template>
        <template #cell-keterangan="{ item }">{{ item.keterangan || '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Tunggakan Mahasiswa' : 'Tambah Tunggakan Mahasiswa'"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SearchableSelect
          v-model="form.nim"
          label="NIM"
          required
          placeholder="Pilih mahasiswa..."
          search-placeholder="Cari NIM atau nama..."
          :options="mahasiswaOptions"
          :disabled="!!editingItem"
          :error="errors.nim"
        />
        <DateInput v-model="form.tanggal" label="Tanggal" required :error="errors.tanggal" />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Nominal Tunggakan<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.nominal)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.nominal
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onNominalInput"
          />
          <p v-if="errors.nominal" class="mt-1 text-label-sm text-error">{{ errors.nominal }}</p>
        </label>
        <TextareaInput v-model="form.keterangan" label="Keterangan" :rows="3" placeholder="mis. Saldo awal migrasi dari sistem lama" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tunggakan Mahasiswa"
      :message="`Yakin ingin menghapus data tunggakan ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
