<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RichTextEditor from '@/components/ui/RichTextEditor.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { pengumumanApi } from '@/api/pengumuman';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate } from '@/utils/format';
import type { Pengumuman } from '@/types/entities';

/**
 * Pengumuman BAAK yang tampil di menu Pengumuman portal mahasiswa (semua prodi atau satu prodi). Halaman yang sama
 * dipakai LMS → Pengumuman (hak akses mengikuti menu route-nya).
 */
const { canCreate, canUpdate, canDelete } = usePermission((useRoute().meta.menuCode as string | undefined) ?? MENU.BAAK_PENGUMUMAN_MANAGEMENT);

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
} = useCrudPage({ fetchList: pengumumanApi.list, remove: pengumumanApi.remove });

fetchItems();

const prodiOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  try {
    const res = await jurusanApi.listProdi({ limit: 100 });
    prodiOptions.value = res.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  } catch {
    prodiOptions.value = [];
  }
});

const UNTUK_OPTIONS = [
  { value: 'SEMUA', label: 'Mahasiswa & Dosen' },
  { value: 'MAHASISWA', label: 'Mahasiswa' },
  { value: 'DOSEN', label: 'Dosen' },
];
const UNTUK_LABEL: Record<string, string> = { SEMUA: 'Mahasiswa & Dosen', MAHASISWA: 'Mahasiswa', DOSEN: 'Dosen' };

const columns: DataTableColumn[] = [
  { key: 'judul', label: 'Judul', sortable: true },
  { key: 'prodi', label: 'Untuk' },
  { key: 'tanggalTerbit', label: 'Terbit', sortable: true },
  { key: 'tanggalBerakhir', label: 'Berakhir', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
];

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Status tayang di portal mahasiswa saat ini. */
const statusTayang = (p: Pengumuman): { label: string; variant: 'success' | 'warning' | 'neutral' } => {
  const today = hariIni();
  if (!p.isActive) return { label: 'Nonaktif', variant: 'neutral' };
  if (p.tanggalTerbit > today) return { label: 'Terjadwal', variant: 'warning' };
  if (p.tanggalBerakhir && p.tanggalBerakhir < today) return { label: 'Berakhir', variant: 'neutral' };
  return { label: 'Tayang', variant: 'success' };
};

const form = reactive({
  judul: '',
  isi: '',
  jurusanId: null as number | string | null,
  untuk: 'SEMUA' as number | string | null,
  tanggalTerbit: '',
  tanggalBerakhir: '',
  isPenting: false,
  isActive: true,
});
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.judul = editing?.judul ?? '';
    form.isi = editing?.isi ?? '';
    form.jurusanId = editing?.jurusanId ?? null;
    form.untuk = editing?.untuk ?? 'SEMUA';
    form.tanggalTerbit = editing?.tanggalTerbit ?? hariIni();
    form.tanggalBerakhir = editing?.tanggalBerakhir ?? '';
    form.isPenting = editing?.isPenting ?? false;
    form.isActive = editing?.isActive ?? true;
  },
  { immediate: true }
);

const isiKosong = (html: string) => !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.judul.trim()) errors.judul = 'Judul wajib diisi';
  if (isiKosong(form.isi)) errors.isi = 'Isi pengumuman wajib diisi';
  if (!form.tanggalTerbit) errors.tanggalTerbit = 'Tanggal terbit wajib diisi';
  if (form.tanggalBerakhir && form.tanggalTerbit && form.tanggalBerakhir < form.tanggalTerbit) {
    errors.tanggalBerakhir = 'Tidak boleh sebelum tanggal terbit';
  }
  if (Object.keys(errors).length) return;

  const payload = {
    judul: form.judul.trim(),
    isi: form.isi,
    jurusanId: form.jurusanId ? Number(form.jurusanId) : null,
    untuk: (form.untuk || 'SEMUA') as 'SEMUA' | 'MAHASISWA' | 'DOSEN',
    tanggalTerbit: form.tanggalTerbit,
    tanggalBerakhir: form.tanggalBerakhir || null,
    isPenting: form.isPenting,
    isActive: form.isActive,
  };
  submitting.value = true;
  formError.value = null;
  try {
    if (editingItem.value) await pengumumanApi.update(editingItem.value.id, payload);
    else await pengumumanApi.create(payload);
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pengumuman');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Pengumuman" :subtitle="$route.path.startsWith('/lms') ? 'Berita kampus yang tampil di portal & timeline e-learning dosen dan mahasiswa.' : 'Pengumuman akademik yang tampil di portal mahasiswa.'">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Pengumuman</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari judul pengumuman..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-judul="{ item }">
          <span class="font-medium text-on-surface">{{ item.judul }}</span>
          <span v-if="item.isPenting" class="ml-2 px-2 py-0.5 rounded-full text-label-sm bg-error-container text-on-error-container">Penting</span>
        </template>
        <template #cell-prodi="{ item }">
          <span class="block">{{ UNTUK_LABEL[item.untuk] ?? item.untuk }}</span>
          <span class="block text-label-sm text-on-surface-variant">{{ item.jurusan?.namaJurusan ?? 'Semua prodi' }}</span>
        </template>
        <template #cell-tanggalTerbit="{ item }">{{ formatDate(item.tanggalTerbit) }}</template>
        <template #cell-tanggalBerakhir="{ item }">{{ item.tanggalBerakhir ? formatDate(item.tanggalBerakhir) : '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusTayang(item).label" :variant="statusTayang(item).variant" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Pengumuman' : 'Tambah Pengumuman'" size="lg" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.judul" label="Judul" required :error="errors.judul" />
        <RichTextEditor v-model="form.isi" label="Isi Pengumuman" />
        <p v-if="errors.isi" class="-mt-2 text-label-sm text-error">{{ errors.isi }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput v-model="form.untuk" label="Ditujukan untuk" :clearable="false" :options="UNTUK_OPTIONS" />
          <SelectInput v-model="form.jurusanId" label="Untuk Prodi" placeholder="Semua prodi" :options="prodiOptions" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalTerbit" label="Tanggal Terbit" required :error="errors.tanggalTerbit" />
          <DateInput v-model="form.tanggalBerakhir" label="Tanggal Berakhir" hint="Kosongkan bila tidak ada batas" :error="errors.tanggalBerakhir" />
        </div>
        <CheckboxToggle v-model="form.isPenting" label="Penting" description="Ditampilkan paling atas dan ditandai di portal mahasiswa." />
        <CheckboxToggle v-model="form.isActive" label="Aktif" description="Nonaktifkan untuk menyembunyikan tanpa menghapus." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pengumuman"
      :message="`Yakin ingin menghapus pengumuman &quot;${deleteTarget?.judul ?? ''}&quot;?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
