<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { keringananApi, type KeringananPayload } from '@/api/keringanan';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Keringanan, StatusKeringanan } from '@/types/entities';

const mahasiswaOptions = ref<{ value: string; label: string }[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 500 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.nim, label: `${m.nim} - ${m.namaLengkap}` }));
});

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_KERINGANAN_MANAGEMENT);

const STATUS_LABELS: Record<StatusKeringanan, string> = {
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};
const STATUS_VARIANT: Record<StatusKeringanan, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};
const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

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
} = useCrudPage<Keringanan>({
  fetchList: keringananApi.list,
  remove: keringananApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'totalTagihan', label: 'Total Tagihan', align: 'right' },
  { key: 'jumlahBayar', label: 'Nilai yang akan dibayar', align: 'right' },
  { key: 'tanggal', label: 'Pada tanggal', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'alasan', label: 'Alasan' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  nim: string;
  tanggal: string;
  jumlahBayar: number | null;
  alasan: string;
  status: StatusKeringanan;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  nim: '',
  tanggal: todayIso(),
  jumlahBayar: null,
  alasan: '',
  status: 'DIAJUKAN',
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
      form.jumlahBayar = editing.jumlahBayar;
      form.alasan = editing.alasan ?? '';
      form.status = editing.status;
    }
  },
  { immediate: true }
);

const onJumlahBayarInput = (event: Event) => {
  form.jumlahBayar = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'NIM wajib diisi';
  if (!form.tanggal) errors.tanggal = 'Tanggal wajib diisi';
  if (!form.jumlahBayar || form.jumlahBayar <= 0) errors.jumlahBayar = 'Jumlah bayar wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: KeringananPayload = {
      nim: form.nim.trim(),
      tanggal: form.tanggal,
      jumlahBayar: Number(form.jumlahBayar),
      alasan: form.alasan.trim() || null,
      status: form.status,
    };
    if (editingItem.value) {
      await keringananApi.update(editingItem.value.id, payload);
    } else {
      await keringananApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data keringanan');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Keringanan" subtitle="Kelola pengajuan keringanan biaya kuliah mahasiswa.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Keringanan</div>

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
        empty-message="Belum ada data keringanan"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-totalTagihan="{ item }">{{ formatCurrencyIdr(item.totalTagihan) }}</template>
        <template #cell-jumlahBayar="{ item }">{{ formatCurrencyIdr(item.jumlahBayar) }}</template>
        <template #cell-tanggal="{ item }">{{ formatDate(item.tanggal) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="STATUS_LABELS[item.status]" :variant="STATUS_VARIANT[item.status]" />
        </template>
        <template #cell-alasan="{ item }">{{ item.alasan || '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      title="Form Input Data Master Keringanan"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <DateInput v-model="form.tanggal" label="Tanggal" required :error="errors.tanggal" />
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
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Jumlah Bayar<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.jumlahBayar)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.jumlahBayar
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onJumlahBayarInput"
          />
          <p v-if="errors.jumlahBayar" class="mt-1 text-label-sm text-error">{{ errors.jumlahBayar }}</p>
        </label>
        <TextareaInput v-model="form.alasan" label="Alasan" :rows="3" placeholder="Alasan pengajuan keringanan..." />
        <SelectInput v-model="form.status" label="Status" placeholder="-- Status --" :options="statusOptions" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Keringanan"
      :message="`Yakin ingin menghapus data keringanan ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
