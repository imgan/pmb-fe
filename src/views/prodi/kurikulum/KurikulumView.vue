<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { kurikulumApi, type KurikulumPayload } from '@/api/kurikulum';
import { mataKuliahApi } from '@/api/mataKuliah';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { useProdiContext } from '@/composables/useProdiContext';
import { MENU } from '@/constants/menuCodes';
import { formatDate } from '@/utils/format';
import type { Kurikulum } from '@/types/entities';

/**
 * Prodi → Kurikulum → Master Kurikulum: daftar kurikulum (header prodi + tahun). Satu kurikulum
 * memiliki banyak mata kuliah — dikelola di halaman detail (tombol "Mata Kuliah").
 */
const router = useRouter();
const { prodiLocked, prodiPlaceholder, defaultJurusanId, isProdiScoped } = useProdiContext();
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_KURIKULUM_MANAGEMENT);

const jurusanOptions = ref<SelectOption[]>([]);
const tahunKurikulumOptions = ref<SelectOption[]>([]);
const loadTahunKurikulumOptions = async () => {
  const years = await kurikulumApi.tahunOptions();
  tahunKurikulumOptions.value = years.map((y) => ({ value: y, label: `Kurikulum ${y}` }));
};
onMounted(async () => {
  const jurusanResult = await jurusanApi.listProdi({ limit: 200 });
  jurusanOptions.value = jurusanResult.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  loadTahunKurikulumOptions();
});

const jurusanFilter = ref<number | ''>('');
const tahunKurikulumFilter = ref<number | ''>('');


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
} = useCrudPage<Kurikulum>({
  fetchList: kurikulumApi.list,
  remove: kurikulumApi.remove,
  extraQuery: () => ({ jurusanId: jurusanFilter.value || undefined, tahunKurikulum: tahunKurikulumFilter.value || undefined }),
});
fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Kurikulum', sortable: true },
  { key: 'jurusan', label: 'Prodi' },
  { key: 'tahunKurikulum', label: 'Tahun', align: 'center', sortable: true },
  { key: 'efektif', label: 'Masa Efektif' },
  // Grup header "Mata Kuliah": jumlah MK OBE | Non OBE | Total.
  { key: 'jumlahObe', label: 'OBE', align: 'center', group: 'Mata Kuliah' },
  { key: 'jumlahNonObe', label: 'Non OBE', align: 'center', group: 'Mata Kuliah' },
  { key: 'jumlahMataKuliah', label: 'Total', align: 'center', group: 'Mata Kuliah' },
  { key: 'totalSks', label: 'Jumlah SKS', align: 'center' },
  { key: 'isActive', label: 'Status', align: 'center' },
  { key: 'mk', label: 'Detail', align: 'center' },
];

interface FormState {
  jurusanId: number | string | null;
  tahunKurikulum: string;
  nama: string;
  tanggalMulaiEfektif: string;
  tanggalAkhirEfektif: string;
  keterangan: string;
  isActive: boolean;
}
const emptyForm = (): FormState => ({
  jurusanId: defaultJurusanId ?? '',
  tahunKurikulum: '',
  nama: '',
  tanggalMulaiEfektif: '',
  tanggalAkhirEfektif: '',
  keterangan: '',
  isActive: true,
});
const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, k]) => {
    if (!open) return;
    Object.keys(errors).forEach((key) => delete errors[key]);
    formError.value = null;
    Object.assign(form, emptyForm());
    if (k) {
      Object.assign(form, {
        jurusanId: k.jurusanId ?? '',
        tahunKurikulum: k.tahunKurikulum ? String(k.tahunKurikulum) : '',
        nama: k.nama,
        tanggalMulaiEfektif: k.tanggalMulaiEfektif?.slice(0, 10) ?? '',
        tanggalAkhirEfektif: k.tanggalAkhirEfektif?.slice(0, 10) ?? '',
        keterangan: k.keterangan ?? '',
        isActive: k.isActive,
      });
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.jurusanId) errors.jurusanId = 'Prodi wajib dipilih';
  if (!/^(19|20)\d{2}$/.test(form.tahunKurikulum.trim())) errors.tahunKurikulum = 'Isi tahun 4 digit, mis. 2026';
  if (Object.keys(errors).length) return;

  const payload: KurikulumPayload = {
    jurusanId: Number(form.jurusanId),
    tahunKurikulum: Number(form.tahunKurikulum.trim()),
    nama: form.nama.trim() || null,
    tanggalMulaiEfektif: form.tanggalMulaiEfektif || null,
    tanggalAkhirEfektif: form.tanggalAkhirEfektif || null,
    keterangan: form.keterangan.trim() || null,
    isActive: form.isActive,
  };
  submitting.value = true;
  formError.value = null;
  try {
    if (editingItem.value) await kurikulumApi.update(editingItem.value.id, payload);
    else await kurikulumApi.create(payload);
    onSaved();
    loadTahunKurikulumOptions();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan kurikulum');
  } finally {
    submitting.value = false;
  }
};

const bukaMataKuliah = (k: Kurikulum) => router.push({ name: 'prodi-kurikulum-detail', params: { id: k.id } });
const exportSemua = () => mataKuliahApi.exportExcel({ jurusanId: jurusanFilter.value || undefined, tahunKurikulum: tahunKurikulumFilter.value || undefined });
const importSemua = (file: string) => mataKuliahApi.importExcel(file);
const onImported = () => {
  fetchItems();
  loadTahunKurikulumOptions();
};
</script>

<template>
  <div>
    <PageHeader title="Master Kurikulum" subtitle="Kurikulum per prodi & tahun; tiap kurikulum memiliki banyak mata kuliah.">
      <template #actions>
        <ImportExportButtons
          :export-fn="exportSemua"
          :import-fn="importSemua"
          :template-fn="mataKuliahApi.importTemplate"
          :can-import="canCreate"
          filename="mata-kuliah-kurikulum.xlsx"
          template-filename="template-import-mata-kuliah.xlsx"
          @imported="onImported"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Kurikulum</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Kurikulum</div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 md:justify-end">
        <div class="w-full md:w-52">
          <SelectInput v-model="jurusanFilter" :placeholder="prodiPlaceholder('Semua Prodi')" :disabled="prodiLocked" :options="jurusanOptions" @change="onFilterChange" />
        </div>
        <div class="w-full md:w-52">
          <SelectInput v-model="tahunKurikulumFilter" placeholder="Semua Tahun Kurikulum" :options="tahunKurikulumOptions" @change="onFilterChange" />
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari nama kurikulum..." />
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
        empty-message="Belum ada kurikulum"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nama="{ item }">
          <button type="button" class="font-medium text-primary hover:underline text-left" @click="bukaMataKuliah(item)">{{ item.nama }}</button>
        </template>
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-tahunKurikulum="{ item }">{{ item.tahunKurikulum ?? '-' }}</template>
        <template #cell-efektif="{ item }">
          <span class="whitespace-nowrap">
            {{ item.tanggalMulaiEfektif ? formatDate(item.tanggalMulaiEfektif) : '-' }} – {{ item.tanggalAkhirEfektif ? formatDate(item.tanggalAkhirEfektif) : 'sekarang' }}
          </span>
        </template>
        <template #cell-jumlahObe="{ item }">{{ item.jumlahObe ?? 0 }}</template>
        <template #cell-jumlahNonObe="{ item }">{{ item.jumlahNonObe ?? 0 }}</template>
        <template #cell-jumlahMataKuliah="{ item }">{{ item.jumlahMataKuliah ?? 0 }}</template>
        <template #cell-totalSks="{ item }">{{ item.totalSks ?? 0 }}</template>
        <template #cell-isActive="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Nonaktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #cell-mk="{ item }">
          <AppButton variant="secondary" icon="menu_book" @click="bukaMataKuliah(item)">Mata Kuliah</AppButton>
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>
      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Kurikulum' : 'Tambah Kurikulum'" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="form.jurusanId"
            label="Prodi"
            required
            placeholder="-- Pilih Prodi --"
            :disabled="isProdiScoped"
            :options="jurusanOptions"
            :error="errors.jurusanId"
          />
          <TextInput v-model="form.tahunKurikulum" label="Tahun Kurikulum" required placeholder="mis. 2026" inputmode="numeric" maxlength="4" :error="errors.tahunKurikulum" />
        </div>
        <TextInput v-model="form.nama" label="Nama Kurikulum" placeholder="Kosongkan → otomatis &quot;Kurikulum <tahun> <prodi>&quot;" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalMulaiEfektif" label="Tgl Mulai Efektif" />
          <DateInput v-model="form.tanggalAkhirEfektif" label="Tgl Akhir Efektif" />
        </div>
        <TextareaInput v-model="form.keterangan" label="Keterangan" :rows="2" />
        <CheckboxToggle v-model="form.isActive" label="Aktif" description="Kurikulum nonaktif tetap tersimpan beserta mata kuliahnya." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Kurikulum"
      :message="`Hapus ${deleteTarget?.nama ?? ''}? Kurikulum hanya bisa dihapus bila sudah tidak memiliki mata kuliah.`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
