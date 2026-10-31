<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { bimbinganMagangApi, type BimbinganMagangPayload } from '@/api/bimbinganMagang';
import { mahasiswaApi } from '@/api/mahasiswa';
import { pembimbingMagangApi } from '@/api/pembimbingMagang';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { BimbinganMagang, Mahasiswa, PembimbingMagang } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_BIMBINGAN_MAGANG_MANAGEMENT);

const mahasiswaList = ref<Mahasiswa[]>([]);
const pembimbingList = ref<PembimbingMagang[]>([]);
const loadingOptions = ref(true);

onMounted(async () => {
  try {
    const [mahasiswaResult, pembimbingResult] = await Promise.all([
      mahasiswaApi.list({ page: 1, limit: 1000 }),
      pembimbingMagangApi.list({ page: 1, limit: 500 }),
    ]);
    mahasiswaList.value = mahasiswaResult.data;
    pembimbingList.value = pembimbingResult.data;
  } finally {
    loadingOptions.value = false;
  }
});

const mahasiswaOptions = computed(() => mahasiswaList.value.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` })));
const pembimbingOptions = computed(() =>
  pembimbingList.value.map((p) => ({ value: p.id, label: p.dosen?.namaLengkap ?? `Pembimbing #${p.id}` }))
);

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
} = useCrudPage({
  fetchList: bimbinganMagangApi.list,
  remove: bimbinganMagangApi.remove,
});

fetchItems();

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'pembimbing', label: 'Pembimbing' },
  { key: 'judul', label: 'Judul' },
  { key: 'nilai', label: 'Nilai', align: 'center' },
  { key: 'kelas', label: 'Kelas', align: 'center' },
];

interface FormState {
  mahasiswaId: number | '';
  pembimbingMagangId: number | '';
  judul: string;
  nilai: string;
  kelas: string;
}

const emptyForm = (): FormState => ({ mahasiswaId: '', pembimbingMagangId: '', judul: '', nilai: '', kelas: '' });

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
      const item = editing as BimbinganMagang;
      form.mahasiswaId = item.mahasiswaId;
      form.pembimbingMagangId = item.pembimbingMagangId ?? '';
      form.judul = item.judul ?? '';
      form.nilai = item.nilai ?? '';
      form.kelas = item.kelas ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: BimbinganMagangPayload = {
      mahasiswaId: Number(form.mahasiswaId),
      pembimbingMagangId: form.pembimbingMagangId ? Number(form.pembimbingMagangId) : null,
      judul: form.judul.trim() || null,
      nilai: form.nilai.trim() || null,
      kelas: form.kelas.trim() || null,
    };
    if (editingItem.value) {
      await bimbinganMagangApi.update(editingItem.value.id, payload);
    } else {
      await bimbinganMagangApi.create(payload);
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
    <PageHeader title="Master Mahasiswa Magang" subtitle="Master data mahasiswa magang beserta pembimbing, judul, nilai, dan kelas.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Mahasiswa Magang</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
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
        empty-message="Belum ada data mahasiswa magang"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-pembimbing="{ item }">{{ item.pembimbingMagang?.dosen?.namaLengkap ?? '-' }}</template>
        <template #cell-judul="{ item }">{{ item.judul || '-' }}</template>
        <template #cell-nilai="{ item }">{{ item.nilai || '-' }}</template>
        <template #cell-kelas="{ item }">{{ item.kelas || '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Mahasiswa Magang' : 'Tambah Mahasiswa Magang'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.mahasiswaId"
          label="Mahasiswa"
          required
          :error="errors.mahasiswaId"
          :disabled="loadingOptions"
          placeholder="Pilih mahasiswa (NIM - nama)..."
          :options="mahasiswaOptions"
        />
        <SelectInput
          v-model="form.pembimbingMagangId"
          label="Pembimbing"
          :disabled="loadingOptions"
          placeholder="Pilih pembimbing magang..."
          :options="pembimbingOptions"
        />
        <TextareaInput v-model="form.judul" label="Judul" :rows="3" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.nilai" label="Nilai" placeholder="mis. A, B+, 85" />
          <TextInput v-model="form.kelas" label="Kelas" placeholder="mis. B" />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Mahasiswa Magang"
      :message="`Yakin ingin menghapus data mahasiswa magang ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
