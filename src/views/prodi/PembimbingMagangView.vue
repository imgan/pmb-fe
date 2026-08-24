<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { pembimbingMagangApi, type PembimbingMagangPayload } from '@/api/pembimbingMagang';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Dosen, PembimbingMagang } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_PEMBIMBING_MAGANG_MANAGEMENT);

const dosenList = ref<Dosen[]>([]);
const loadingDosen = ref(true);
onMounted(async () => {
  try {
    const result = await dosenApi.list({ page: 1, limit: 500 });
    dosenList.value = result.data;
  } finally {
    loadingDosen.value = false;
  }
});
const dosenOptions = computed(() => dosenList.value.map((d) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` })));

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
  fetchList: pembimbingMagangApi.list,
  remove: pembimbingMagangApi.remove,
});

fetchItems();

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'namaDosen', label: 'Nama Dosen' },
  { key: 'noSk', label: 'No. SK' },
  { key: 'tanggalSk', label: 'Tanggal SK', sortable: true },
];

const formatTanggal = (value: string | null) => (value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-');

interface FormState {
  dosenId: number | '';
  noSk: string;
  tanggalSk: string;
}

const emptyForm = (): FormState => ({ dosenId: '', noSk: '', tanggalSk: '' });

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
      const item = editing as PembimbingMagang;
      form.dosenId = item.dosenId;
      form.noSk = item.noSk ?? '';
      form.tanggalSk = item.tanggalSk?.slice(0, 10) ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.dosenId) errors.dosenId = 'Dosen wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PembimbingMagangPayload = {
      dosenId: Number(form.dosenId),
      noSk: form.noSk.trim() || null,
      tanggalSk: form.tanggalSk || null,
    };
    if (editingItem.value) {
      await pembimbingMagangApi.update(editingItem.value.id, payload);
    } else {
      await pembimbingMagangApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Pembimbing Magang" subtitle="Master data dosen pembimbing magang.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Pembimbing Magang</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari nama dosen..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data pembimbing magang"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-namaDosen="{ item }">{{ item.dosen?.namaLengkap ?? '-' }}</template>
        <template #cell-noSk="{ item }">{{ item.noSk || '-' }}</template>
        <template #cell-tanggalSk="{ item }">{{ formatTanggal(item.tanggalSk) }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Pembimbing Magang' : 'Tambah Pembimbing Magang'"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.dosenId"
          label="Dosen"
          required
          :error="errors.dosenId"
          :disabled="loadingDosen"
          placeholder="Pilih dosen..."
          :options="dosenOptions"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.noSk" label="No. SK" />
          <DateInput v-model="form.tanggalSk" label="Tanggal SK" />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembimbing Magang"
      :message="`Yakin ingin menghapus data pembimbing magang ${deleteTarget?.dosen?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
