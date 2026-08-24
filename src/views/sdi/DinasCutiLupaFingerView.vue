<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { dinasCutiLupaFingerApi, type DinasCutiPayload } from '@/api/dinasCutiLupaFinger';
import { karyawanApi } from '@/api/karyawan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastError } from '@/utils/swal';
import { dataUrlToBlob } from '@/utils/download';
import type { DinasCutiStatus, Karyawan } from '@/types/entities';

const ALLOWED_LAMPIRAN_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_LAMPIRAN_SIZE_BYTES = 5 * 1024 * 1024;

const { canCreate, canUpdate, canDelete } = usePermission(MENU.DINAS_CUTI_LUPA_FINGER_MANAGEMENT);

const STATUS_OPTIONS: { value: DinasCutiStatus; label: string }[] = [
  { value: 'DINAS_LUAR', label: 'Dinas Luar' },
  { value: 'CUTI', label: 'Cuti' },
  { value: 'LUPA_KEHADIRAN', label: 'Lupa Kehadiran' },
  { value: 'CUTI_SPESIAL', label: 'Cuti Spesial' },
  { value: 'CUTI_BERSAMA', label: 'Cuti Bersama' },
];

const statusLabel = (status: DinasCutiStatus) => STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
const statusVariant = (status: DinasCutiStatus) => {
  if (status === 'DINAS_LUAR') return 'success';
  if (status === 'LUPA_KEHADIRAN') return 'danger';
  return 'warning';
};

const statusFilter = ref<'' | DinasCutiStatus>('');
const statusFilterOptions = STATUS_OPTIONS;

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
  fetchList: dinasCutiLupaFingerApi.list,
  remove: dinasCutiLupaFingerApi.remove,
  extraQuery: () => ({ status: statusFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'kodeKaryawan', label: 'Kode Karyawan' },
  { key: 'namaLengkap', label: 'Nama Lengkap' },
  { key: 'posisi', label: 'Posisi' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'tanggalKehadiran', label: 'Tanggal Kehadiran', sortable: true },
  { key: 'status', label: 'Keterangan', align: 'center', sortable: true },
  { key: 'keperluan', label: 'Keperluan' },
  { key: 'lampiran', label: 'Lampiran' },
];

const formatTanggal = (value: string) => new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' });

const karyawanList = ref<Karyawan[]>([]);
const loadingKaryawan = ref(true);
onMounted(async () => {
  try {
    const result = await karyawanApi.list({ page: 1, limit: 500 });
    karyawanList.value = result.data;
  } catch (err) {
    // form select will just be empty; the modal still shows the underlying error on submit if needed
  } finally {
    loadingKaryawan.value = false;
  }
});
const karyawanOptions = computed(() =>
  karyawanList.value.map((k) => ({ value: k.id, label: `${k.nip} - ${k.namaLengkap}` }))
);

interface FormState {
  karyawanId: number | '';
  tanggalKehadiran: string;
  status: DinasCutiStatus | '';
  keperluan: string;
  lampiranNama: string | null;
  lampiran: string | null;
}

const emptyForm = (): FormState => ({
  karyawanId: '',
  tanggalKehadiran: '',
  status: '',
  keperluan: '',
  lampiranNama: null,
  lampiran: null,
});

const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const onLampiranChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!ALLOWED_LAMPIRAN_TYPES.includes(file.type)) {
    toastError('Format file tidak didukung. Hanya PDF, PNG, atau JPEG.');
    input.value = '';
    return;
  }
  if (file.size > MAX_LAMPIRAN_SIZE_BYTES) {
    toastError('Ukuran file maksimal 5 MB.');
    input.value = '';
    return;
  }

  form.lampiran = await readFileAsDataUrl(file);
  form.lampiranNama = file.name;
  input.value = '';
};

const clearLampiran = () => {
  form.lampiran = null;
  form.lampiranNama = null;
};

const previewOpen = ref(false);
const previewObjectUrl = ref<string | null>(null);
const previewLampiranNama = ref<string | null>(null);
const previewMime = ref<string | null>(null);
const previewIsImage = computed(() => previewMime.value?.startsWith('image/') ?? false);

const revokePreviewObjectUrl = () => {
  if (previewObjectUrl.value) URL.revokeObjectURL(previewObjectUrl.value);
  previewObjectUrl.value = null;
};

const openLampiranPreview = (lampiran: string | null, lampiranNama: string | null) => {
  if (!lampiran) return;
  revokePreviewObjectUrl();
  const blob = dataUrlToBlob(lampiran);
  previewMime.value = blob.type;
  previewObjectUrl.value = URL.createObjectURL(blob);
  previewLampiranNama.value = lampiranNama;
  previewOpen.value = true;
};

const closeLampiranPreview = () => {
  previewOpen.value = false;
  previewLampiranNama.value = null;
  previewMime.value = null;
  revokePreviewObjectUrl();
};

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    Object.assign(form, emptyForm());
    if (editing) {
      form.karyawanId = editing.karyawanId;
      form.tanggalKehadiran = editing.tanggalKehadiran?.slice(0, 10) ?? '';
      form.status = editing.status;
      form.keperluan = editing.keperluan ?? '';
      form.lampiranNama = editing.lampiranNama ?? null;
      form.lampiran = editing.lampiran ?? null;
    }
  },
  { immediate: true }
);

const selectedKaryawan = computed(() => karyawanList.value.find((k) => k.id === form.karyawanId) ?? null);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.karyawanId) errors.karyawanId = 'Karyawan wajib dipilih';
  if (!form.tanggalKehadiran) errors.tanggalKehadiran = 'Tanggal kehadiran wajib diisi';
  if (!form.status) errors.status = 'Status wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: DinasCutiPayload = {
      karyawanId: Number(form.karyawanId),
      tanggalKehadiran: form.tanggalKehadiran,
      status: form.status as DinasCutiStatus,
      keperluan: form.keperluan?.trim() || null,
      lampiranNama: form.lampiranNama,
      lampiran: form.lampiran,
    };
    if (editingItem.value) {
      await dinasCutiLupaFingerApi.update(editingItem.value.id, payload);
    } else {
      await dinasCutiLupaFingerApi.create(payload);
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
    <PageHeader title="Form Input Data Dinas/Cuti/Lupa Kehadiran" subtitle="Catat pengajuan dinas, cuti, atau lupa finger karyawan.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <div class="mb-4 px-4 py-2.5 rounded-md bg-primary-container text-on-primary-container text-body-sm text-center font-medium">
      Semua Data Form Input Data Dinas/Cuti/Lupa Kehadiran
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari kode karyawan atau nama..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="statusFilterOptions" @change="onFilterChange" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-kodeKaryawan="{ item }">{{ item.karyawan?.nip ?? '-' }}</template>
        <template #cell-namaLengkap="{ item }">{{ item.karyawan?.namaLengkap ?? '-' }}</template>
        <template #cell-posisi="{ item }">{{ item.karyawan?.bagian ?? '-' }}</template>
        <template #cell-jabatan="{ item }">{{ item.karyawan?.jabatan ?? '-' }}</template>
        <template #cell-tanggalKehadiran="{ item }">{{ formatTanggal(item.tanggalKehadiran) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusLabel(item.status)" :variant="statusVariant(item.status)" />
        </template>
        <template #cell-keperluan="{ item }">{{ item.keperluan || '-' }}</template>
        <template #cell-lampiran="{ item }">
          <button
            v-if="item.lampiran"
            type="button"
            class="inline-flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
            @click="openLampiranPreview(item.lampiran, item.lampiranNama)"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">description</span>
            {{ item.lampiranNama || 'Lihat file' }}
          </button>
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Data Dinas/Cuti/Lupa Finger' : 'Tambah Data Dinas/Cuti/Lupa Finger'"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.karyawanId"
          label="Karyawan"
          required
          :error="errors.karyawanId"
          :disabled="loadingKaryawan"
          placeholder="Pilih karyawan (kode - nama)..."
          :options="karyawanOptions"
        />
        <div v-if="selectedKaryawan" class="grid grid-cols-2 gap-4 p-3 rounded-md bg-surface-container-low text-body-sm">
          <p><span class="text-on-surface-variant">Posisi:</span> {{ selectedKaryawan.bagian || '-' }}</p>
          <p><span class="text-on-surface-variant">Jabatan:</span> {{ selectedKaryawan.jabatan || '-' }}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalKehadiran" label="Tanggal Kehadiran" required :error="errors.tanggalKehadiran" />
          <SelectInput v-model="form.status" label="Keterangan" required :error="errors.status" placeholder="-- Pilih Keterangan --" :options="STATUS_OPTIONS" />
        </div>
        <TextareaInput v-model="form.keperluan" label="Keperluan" placeholder="mis. Cuti tahunan, dinas luar kota, dsb." />

        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Lampiran</span>
          <div
            v-if="form.lampiran"
            class="flex items-center justify-between gap-3 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-low"
          >
            <button
              type="button"
              class="flex items-center gap-2 text-body-sm text-primary hover:underline truncate"
              @click="openLampiranPreview(form.lampiran, form.lampiranNama)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">description</span>
              {{ form.lampiranNama || 'Lihat file terlampir' }}
            </button>
            <button
              type="button"
              class="text-outline hover:text-error transition-colors shrink-0"
              title="Hapus lampiran"
              @click="clearLampiran"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">close</span>
            </button>
          </div>
          <input
            v-else
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            class="w-full text-body-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-container file:text-on-primary-container file:font-medium file:text-label-sm hover:file:opacity-90 file:cursor-pointer cursor-pointer border border-outline-variant rounded-md bg-surface-container-lowest"
            @change="onLampiranChange"
          />
          <p class="mt-1 text-label-sm text-on-surface-variant">Format PDF, PNG, atau JPEG. Maksimal 5 MB.</p>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Data"
      :message="`Yakin ingin menghapus data ${deleteTarget?.karyawan?.namaLengkap ?? ''} pada ${deleteTarget ? formatTanggal(deleteTarget.tanggalKehadiran) : ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <Modal
      :model-value="previewOpen"
      :title="previewLampiranNama || 'Lampiran'"
      size="lg"
      @update:model-value="closeLampiranPreview"
    >
      <div v-if="previewIsImage" class="flex justify-center">
        <img :src="previewObjectUrl ?? undefined" alt="Lampiran" class="max-w-full max-h-[60vh] object-contain rounded-md border border-outline-variant" />
      </div>
      <iframe
        v-else-if="previewObjectUrl"
        :src="previewObjectUrl"
        title="Lampiran"
        class="w-full h-[60vh] rounded-md border border-outline-variant"
      />
      <template #footer>
        <a
          v-if="previewObjectUrl"
          :href="previewObjectUrl"
          target="_blank"
          rel="noopener"
          class="text-body-sm text-primary hover:underline mr-auto"
        >
          Buka di tab baru
        </a>
        <AppButton variant="secondary" @click="closeLampiranPreview">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>
