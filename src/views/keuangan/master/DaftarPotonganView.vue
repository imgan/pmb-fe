<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { daftarPotonganApi, type DaftarPotonganPayload } from '@/api/daftarPotongan';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { DaftarPotongan } from '@/types/entities';

const { canCreate, canDelete } = usePermission(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT);

const mahasiswaOptions = ref<{ value: string; label: string }[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 1000 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.nim, label: `${m.nim} - ${m.namaLengkap}` }));
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
  fetchItems,
  openCreate,
  closeForm,
  onSaved,
  requestDelete,
  cancelDelete,
  confirmDelete,
} = useCrudPage<DaftarPotongan>({
  fetchList: daftarPotonganApi.list,
  remove: daftarPotonganApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nama', label: 'Nama' },
  { key: 'potongan', label: 'Potongan' },
  { key: 'biaya', label: 'Biaya', align: 'right' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'alasan', label: 'Alasan' },
  { key: 'asal', label: 'Dari' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  nim: string;
  biaya: number | null;
  semester: number | '';
  alasan: string;
  asal: string;
}

const emptyForm = (): FormState => ({
  nim: '',
  biaya: null,
  semester: '',
  alasan: '',
  asal: '',
});

const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(isFormOpen, (open) => {
  if (!open) return;
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
  Object.assign(form, emptyForm());
});

const onBiayaInput = (event: Event) => {
  form.biaya = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'NIM wajib dipilih';
  if (!form.biaya || form.biaya <= 0) errors.biaya = 'Biaya wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: DaftarPotonganPayload = {
      nim: form.nim.trim(),
      biaya: Number(form.biaya),
      semester: form.semester === '' ? null : Number(form.semester),
      alasan: form.alasan.trim() || null,
      asal: form.asal.trim() || null,
    };
    await daftarPotonganApi.create(payload);
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data potongan');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Daftar Potongan" subtitle="Daftar potongan biaya kuliah mahasiswa.">
      <template #actions>
        <ImportExportButtons
          :export-fn="daftarPotonganApi.exportExcel"
          :import-fn="daftarPotonganApi.importExcel"
          :template-fn="daftarPotonganApi.importTemplate"
          :can-import="canCreate"
          filename="daftar-potongan.xlsx"
          template-filename="template-import-daftar-potongan.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Daftar Potongan</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
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
        empty-message="Belum ada data potongan"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nama="{ item }">{{ item.mahasiswa?.nim ?? '-' }} {{ item.mahasiswa?.namaLengkap ?? '' }}</template>
        <template #cell-potongan>-</template>
        <template #cell-biaya="{ item }">{{ formatCurrencyIdr(item.biaya) }}</template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
        <template #cell-alasan="{ item }">{{ item.alasan || '-' }}</template>
        <template #cell-asal="{ item }">{{ item.asal || '-' }}</template>
        <template #actions="{ item }">
          <button
            v-if="canDelete"
            type="button"
            class="text-on-surface-variant hover:text-error transition-colors"
            title="Hapus"
            @click="requestDelete(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" title="Form Input Data Master Daftar Potongan" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
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
        <SearchableSelect
          v-model="form.nim"
          label="NIM"
          required
          placeholder="Pilih mahasiswa..."
          search-placeholder="Cari NIM atau nama..."
          :options="mahasiswaOptions"
          :error="errors.nim"
        />
        <TextInput v-model.number="form.semester" label="Semester" type="number" placeholder="14" />
        <TextareaInput v-model="form.alasan" label="Alasan" :rows="2" placeholder="mis. Beasiswa LLDIKTI" />
        <TextInput v-model="form.asal" label="Asal" placeholder="mis. LLDIKTI" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Potongan"
      :message="`Yakin ingin menghapus data potongan ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
