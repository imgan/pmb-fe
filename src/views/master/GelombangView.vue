<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { tahunPmbApi } from '@/api/tahunModul';
import type { Gelombang, StatusGelombang, TahunModul } from '@/types/entities';
import { gelombangApi } from '@/api/gelombang';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate, toDateInputValue } from '@/utils/format';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.GELOMBANG_MANAGEMENT);

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
} = useCrudPage({ fetchList: gelombangApi.list, remove: gelombangApi.remove });

fetchItems();

// Pilihan Tahun Ajaran PMB (Modul Admin › Tahun (PMB)); gelombang baru otomatis memakai Tahun PMB aktif.
const tahunList = ref<TahunModul[]>([]);
tahunPmbApi
  .list({ limit: 100 })
  .then((r) => (tahunList.value = r.data))
  .catch(() => (tahunList.value = []));
const tahunOptions = computed(() => tahunList.value.map((t) => ({ value: t.id, label: `${t.nama} ${t.jenisSemester}${t.isActive ? ' (Tahun PMB aktif)' : ''}` })));
const labelTahun = (t?: { nama: string; jenisSemester: string } | null) => (t ? `${t.nama} ${t.jenisSemester}` : '-');

const isGelombangAktif = (startDate: string, endDate: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return startDate <= today && endDate >= today;
};
/** Status efektif: AKTIF / TIDAK_AKTIF diatur manual admin; OTOMATIS mengikuti rentang tanggal. */
const statusAktif = (g: Gelombang) => (g.status === 'AKTIF' ? true : g.status === 'TIDAK_AKTIF' ? false : isGelombangAktif(g.startDate, g.endDate));
const STATUS_OPTIONS = [
  { value: 'OTOMATIS', label: 'Otomatis (sesuai tanggal)' },
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
];

const columns: DataTableColumn[] = [
  { key: 'namaGelombang', label: 'Gelombang', sortable: true },
  { key: 'tahun', label: 'Tahun PMB' },
  { key: 'startDate', label: 'Tanggal Mulai', sortable: true },
  { key: 'endDate', label: 'Tanggal Selesai', sortable: true },
  { key: 'deskripsi', label: 'Deskripsi' },
  { key: 'status', label: 'Status', align: 'center' },
];

const form = reactive({ namaGelombang: '', tahunPmbId: '' as number | string | null, startDate: '', endDate: '', deskripsi: '', status: 'OTOMATIS' as string | number | null });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.namaGelombang = editing?.namaGelombang ?? '';
    form.tahunPmbId = editing ? (editing.tahunPmbId ?? '') : (tahunList.value.find((t) => t.isActive)?.id ?? '');
    form.startDate = toDateInputValue(editing?.startDate);
    form.endDate = toDateInputValue(editing?.endDate);
    form.deskripsi = editing?.deskripsi ?? '';
    form.status = editing?.status ?? 'OTOMATIS';
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.namaGelombang.trim()) errors.namaGelombang = 'Nama gelombang wajib diisi';
  if (!form.startDate) errors.startDate = 'Tanggal mulai wajib diisi';
  if (!form.endDate) errors.endDate = 'Tanggal selesai wajib diisi';
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'Tanggal selesai harus setelah atau sama dengan tanggal mulai';
  }
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      namaGelombang: form.namaGelombang.trim(),
      tahunPmbId: form.tahunPmbId ? Number(form.tahunPmbId) : null,
      startDate: form.startDate,
      endDate: form.endDate,
      deskripsi: form.deskripsi.trim() || null,
      status: (form.status || 'OTOMATIS') as StatusGelombang,
    };
    if (editingItem.value) {
      await gelombangApi.update(editingItem.value.id, payload);
    } else {
      await gelombangApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan gelombang');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Gelombang" subtitle="Kelola master data gelombang pendaftaran.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Gelombang</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari gelombang..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-tahun="{ item }">
          <span>{{ labelTahun(item.tahunPmb) }}</span>
        </template>
        <template #cell-startDate="{ item }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(item.startDate) }}</span>
        </template>
        <template #cell-endDate="{ item }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(item.endDate) }}</span>
        </template>
        <template #cell-deskripsi="{ item }">
          <span class="text-on-surface-variant">{{ item.deskripsi || '-' }}</span>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge :variant="statusAktif(item) ? 'success' : 'neutral'" :label="statusAktif(item) ? 'Aktif' : 'Tidak Aktif'" />
          <p v-if="item.status && item.status !== 'OTOMATIS'" class="mt-0.5 text-[11px] text-on-surface-variant">diatur manual</p>
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Gelombang' : 'Tambah Gelombang'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.namaGelombang" label="Nama Gelombang" required :error="errors.namaGelombang" />
        <div>
          <SelectInput v-model="form.tahunPmbId" label="Tahun Ajaran PMB" :options="tahunOptions" placeholder="Tanpa tahun" />
          <p class="mt-1 text-label-sm text-on-surface-variant">Tahun penerimaan gelombang ini. Formulir pendaftaran mengutamakan gelombang pada Tahun PMB aktif.</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <DateInput v-model="form.startDate" label="Tanggal Mulai" required :error="errors.startDate" />
          <DateInput v-model="form.endDate" label="Tanggal Selesai" required :min="form.startDate" :error="errors.endDate" />
        </div>
        <TextareaInput v-model="form.deskripsi" label="Deskripsi" :rows="3" />
        <div>
          <SelectInput v-model="form.status" label="Status" :options="STATUS_OPTIONS" :clearable="false" />
          <p class="mt-1 text-label-sm text-on-surface-variant">
            Otomatis = aktif bila hari ini di antara tanggal mulai–selesai. Aktif = dipakai formulir pendaftaran walau di luar tanggal. Tidak Aktif = tidak dipakai formulir pendaftaran.
          </p>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Gelombang"
      :message="`Yakin ingin menghapus gelombang ${deleteTarget?.namaGelombang ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
