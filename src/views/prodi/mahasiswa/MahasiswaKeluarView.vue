<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Mahasiswa, StatusKeluarMahasiswa } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_MAHASISWA_KELUAR_MANAGEMENT);

const STATUS_KELUAR_VALUES: StatusKeluarMahasiswa[] = ['CUTI', 'MENGUNDURKAN_DIRI', 'DROP_OUT', 'HABIS_MASA_STUDI'];
const STATUS_LABELS: Record<StatusKeluarMahasiswa, string> = {
  CUTI: 'Cuti',
  MENGUNDURKAN_DIRI: 'Mengundurkan Diri',
  DROP_OUT: 'Drop Out',
  HABIS_MASA_STUDI: 'Habis Masa Studi',
  MUTASI: 'Mutasi',
  PUTUS_SEKOLAH: 'Putus Sekolah',
  WAFAT: 'Wafat',
  HILANG: 'Hilang',
  LAINNYA: 'Lainnya',
  MENUNGGU_UKOM: 'Menunggu Ukom',
};
const statusOptions = STATUS_KELUAR_VALUES.map((v) => ({ value: v, label: STATUS_LABELS[v] }));

const statusFilter = ref<StatusKeluarMahasiswa | ''>('');

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
} = useCrudPage<Mahasiswa>({
  fetchList: mahasiswaApi.list,
  remove: async (id) => {
    await mahasiswaApi.update(id, { statusKeluar: null, tanggalKeluar: null, alasanKeluar: null });
  },
  extraQuery: () => ({ statusKeluar: statusFilter.value || STATUS_KELUAR_VALUES.join(',') }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Nama' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'kontak', label: 'No.Telp / Email' },
  { key: 'tanggalKeluar', label: 'Tanggal Keluar', sortable: true },
];

const statusVariant = (status: StatusKeluarMahasiswa | null) => {
  if (status === 'MENGUNDURKAN_DIRI' || status === 'DROP_OUT') return 'danger';
  if (status === 'CUTI') return 'warning';
  return 'neutral';
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Kandidat mahasiswa yang bisa ditandai keluar: aktif & belum punya status keluar.
const activeMahasiswa = ref<Mahasiswa[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ page: 1, limit: 1000, isActive: true });
  activeMahasiswa.value = result.data.filter((m) => !m.statusKeluar);
});
const mahasiswaOptions = computed(() =>
  activeMahasiswa.value.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }))
);

interface FormState {
  mahasiswaId: number | '';
  statusKeluar: StatusKeluarMahasiswa | '';
  tanggalKeluar: string;
  alasanKeluar: string;
}

const emptyForm = (): FormState => ({ mahasiswaId: '', statusKeluar: '', tanggalKeluar: '', alasanKeluar: '' });
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
      form.mahasiswaId = editing.id;
      form.statusKeluar = editing.statusKeluar ?? '';
      form.tanggalKeluar = editing.tanggalKeluar ?? '';
      form.alasanKeluar = editing.alasanKeluar ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (!form.statusKeluar) errors.statusKeluar = 'Status wajib dipilih';
  if (!form.tanggalKeluar) errors.tanggalKeluar = 'Tanggal keluar wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    await mahasiswaApi.update(form.mahasiswaId, {
      statusKeluar: form.statusKeluar as StatusKeluarMahasiswa,
      tanggalKeluar: form.tanggalKeluar,
      alasanKeluar: form.alasanKeluar.trim() || null,
    });
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data mahasiswa keluar');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Mahasiswa Keluar" subtitle="Daftar mahasiswa yang cuti, mengundurkan diri, drop out, atau habis masa studi.">
      <template #actions>
        <AppButton v-if="canCreate" icon="person_remove" @click="openCreate">Tandai Mahasiswa Keluar</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
        <div class="w-full md:w-56">
          <SelectInput v-model="statusFilter" placeholder="Semua Status Keluar" :options="statusOptions" @change="onFilterChange" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data mahasiswa keluar"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nama="{ item }">
          <p class="font-medium text-on-surface">{{ item.nim }}</p>
          <p class="text-on-surface-variant">{{ item.namaLengkap }}</p>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge
            :label="item.statusKeluar ? STATUS_LABELS[item.statusKeluar] : '-'"
            :variant="statusVariant(item.statusKeluar)"
          />
        </template>
        <template #cell-kontak="{ item }">
          <p>{{ item.noTelepon || '-' }}</p>
          <p class="text-on-surface-variant">{{ item.email }}</p>
        </template>
        <template #cell-tanggalKeluar="{ item }">{{ formatDate(item.tanggalKeluar) }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" title="Tandai Mahasiswa Keluar" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.mahasiswaId"
          label="Mahasiswa"
          required
          placeholder="Pilih mahasiswa..."
          :disabled="!!editingItem"
          :options="mahasiswaOptions"
          :error="errors.mahasiswaId"
        />
        <SelectInput
          v-model="form.statusKeluar"
          label="Status Keluar"
          required
          placeholder="Pilih status..."
          :options="statusOptions"
          :error="errors.statusKeluar"
        />
        <TextInput v-model="form.tanggalKeluar" label="Tanggal Keluar" type="date" required :error="errors.tanggalKeluar" />
        <TextInput v-model="form.alasanKeluar" label="Alasan (opsional)" placeholder="Alasan keluar..." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Batalkan Status Keluar"
      :message="`Yakin ingin membatalkan status keluar ${deleteTarget?.namaLengkap ?? ''}? Mahasiswa akan kembali berstatus aktif.`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
