<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { kurikulumApi, type KurikulumPayload } from '@/api/kurikulum';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type {
  Kurikulum,
  KelompokMataKuliah,
  KelompokKurikulum,
  JenisMataKuliah,
  KelompokKompetensi,
} from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_KURIKULUM_MANAGEMENT);

const jurusanOptions = ref<SelectOption[]>([]);
const tahunAjaranOptions = ref<SelectOption[]>([]);
onMounted(async () => {
  const [jurusanResult, tahunAjaranResult] = await Promise.all([
    jurusanApi.list({ limit: 200 }),
    tahunAjaranApi.list({ limit: 100 }),
  ]);
  jurusanOptions.value = jurusanResult.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  tahunAjaranOptions.value = tahunAjaranResult.data.map((t) => ({ value: t.id, label: t.nama }));
});

const SEMESTER_OPTIONS: SelectOption[] = Array.from({ length: 14 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));
const SKS_OPTIONS: SelectOption[] = Array.from({ length: 7 }, (_, i) => ({ value: i, label: String(i) }));

const KELOMPOK_MATA_KULIAH_LABELS: Record<KelompokMataKuliah, string> = {
  MPK: 'MPK - Pengembangan Kepribadian',
  MKK: 'MKK - Keilmuan & Keterampilan',
  MKB: 'MKB - Keahlian Berkarya',
  MPB: 'MPB - Perilaku Berkarya',
  MBB: 'MBB - Berkehidupan Bermasyarakat',
};
const kelompokMataKuliahOptions: SelectOption[] = Object.entries(KELOMPOK_MATA_KULIAH_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const KELOMPOK_KURIKULUM_LABELS: Record<KelompokKurikulum, string> = { WAJIB: 'Wajib', PILIHAN: 'Pilihan' };
const kelompokKurikulumOptions: SelectOption[] = Object.entries(KELOMPOK_KURIKULUM_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const JENIS_MATA_KULIAH_LABELS: Record<JenisMataKuliah, string> = {
  TEORI: 'Teori',
  PRAKTIK: 'Praktik',
  TEORI_PRAKTIK: 'Teori & Praktik',
};
const jenisMataKuliahOptions: SelectOption[] = Object.entries(JENIS_MATA_KULIAH_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const KELOMPOK_KOMPETENSI_LABELS: Record<KelompokKompetensi, string> = {
  UTAMA: 'Utama',
  PENDUKUNG: 'Pendukung',
  LAINNYA: 'Lainnya',
};
const kelompokKompetensiOptions: SelectOption[] = Object.entries(KELOMPOK_KOMPETENSI_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const kompIlmuKomputerOptions: SelectOption[] = [
  'Algoritma & Pemrograman',
  'Basis Data',
  'Jaringan Komputer',
  'Rekayasa Perangkat Lunak',
  'Kecerdasan Buatan',
  'Sistem Informasi',
].map((label) => ({ value: label, label }));

const mataKuliahMinatOptions: SelectOption[] = [
  'Rekayasa Perangkat Lunak',
  'Jaringan & Keamanan',
  'Data Science',
  'Sistem Informasi',
  'Multimedia',
].map((label) => ({ value: label, label }));

const jurusanFilter = ref<number | ''>('');
const tahunAjaranFilter = ref<number | ''>('');

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
  fetchList: kurikulumApi.list,
  remove: kurikulumApi.remove,
  extraQuery: () => ({ jurusanId: jurusanFilter.value || undefined, tahunAjaranId: tahunAjaranFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'kode', label: 'Kode', sortable: true },
  { key: 'mataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'jurusan', label: 'Prodi' },
  { key: 'tahunAjaran', label: 'Tahun Kurikulum', sortable: true },
  { key: 'semester', label: 'Semester', align: 'center', sortable: true },
  { key: 'sksTotal', label: 'SKS Total', align: 'center' },
  { key: 'kelompokMataKuliah', label: 'Kelompok MK', align: 'center' },
  { key: 'jenisMataKuliah', label: 'Jenis MK', align: 'center' },
  { key: 'mataKuliahMinat', label: 'Minat' },
];

interface FormState {
  jurusanId: number | '';
  tahunAjaranId: number | '';
  kode: string;
  mataKuliah: string;
  mataKuliahEn: string;
  kelompokMataKuliah: KelompokMataKuliah | '';
  kelompokKurikulum: KelompokKurikulum | '';
  jenisMataKuliah: JenisMataKuliah | '';
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksSimulasi: number;
  kelompokKompetensi: KelompokKompetensi | '';
  kompIlmuKomputer: string;
  mataKuliahMinat: string;
  muatanMataKuliah: string;
  semester: number | '';
}

const emptyForm = (): FormState => ({
  jurusanId: '',
  tahunAjaranId: '',
  kode: '',
  mataKuliah: '',
  mataKuliahEn: '',
  kelompokMataKuliah: '',
  kelompokKurikulum: '',
  jenisMataKuliah: '',
  sksTeori: 0,
  sksPraktek: 0,
  sksLab: 0,
  sksSimulasi: 0,
  kelompokKompetensi: '',
  kompIlmuKomputer: '',
  mataKuliahMinat: '',
  muatanMataKuliah: '',
  semester: '',
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
      const item = editing as Kurikulum;
      form.jurusanId = item.jurusanId ?? '';
      form.tahunAjaranId = item.tahunAjaranId ?? '';
      form.kode = item.kode;
      form.mataKuliah = item.mataKuliah;
      form.mataKuliahEn = item.mataKuliahEn ?? '';
      form.kelompokMataKuliah = item.kelompokMataKuliah ?? '';
      form.kelompokKurikulum = item.kelompokKurikulum ?? '';
      form.jenisMataKuliah = item.jenisMataKuliah ?? '';
      form.sksTeori = item.sksTeori;
      form.sksPraktek = item.sksPraktek;
      form.sksLab = item.sksLab;
      form.sksSimulasi = item.sksSimulasi;
      form.kelompokKompetensi = item.kelompokKompetensi ?? '';
      form.kompIlmuKomputer = item.kompIlmuKomputer ?? '';
      form.mataKuliahMinat = item.mataKuliahMinat ?? '';
      form.muatanMataKuliah = item.muatanMataKuliah ?? '';
      form.semester = item.semester ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kode.trim()) errors.kode = 'Kode matakuliah wajib diisi';
  if (!form.mataKuliah.trim()) errors.mataKuliah = 'Nama matakuliah wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: KurikulumPayload = {
      jurusanId: form.jurusanId === '' ? null : Number(form.jurusanId),
      tahunAjaranId: form.tahunAjaranId === '' ? null : Number(form.tahunAjaranId),
      kode: form.kode.trim(),
      mataKuliah: form.mataKuliah.trim(),
      mataKuliahEn: form.mataKuliahEn.trim() || null,
      kelompokMataKuliah: form.kelompokMataKuliah || null,
      kelompokKurikulum: form.kelompokKurikulum || null,
      jenisMataKuliah: form.jenisMataKuliah || null,
      sksTeori: Number(form.sksTeori) || 0,
      sksPraktek: Number(form.sksPraktek) || 0,
      sksLab: Number(form.sksLab) || 0,
      sksSimulasi: Number(form.sksSimulasi) || 0,
      kelompokKompetensi: form.kelompokKompetensi || null,
      kompIlmuKomputer: form.kompIlmuKomputer || null,
      mataKuliahMinat: form.mataKuliahMinat || null,
      muatanMataKuliah: form.muatanMataKuliah.trim() || null,
      semester: form.semester === '' ? null : Number(form.semester),
    };
    if (editingItem.value) {
      await kurikulumApi.update(editingItem.value.id, payload);
    } else {
      await kurikulumApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data kurikulum');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Kurikulum" subtitle="Master data kurikulum / mata kuliah.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Kurikulum</div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 md:justify-end">
        <div class="w-full md:w-52">
          <SelectInput v-model="jurusanFilter" placeholder="Semua Prodi" :options="jurusanOptions" @change="onFilterChange" />
        </div>
        <div class="w-full md:w-52">
          <SelectInput
            v-model="tahunAjaranFilter"
            placeholder="Semua Tahun Kurikulum"
            :options="tahunAjaranOptions"
            @change="onFilterChange"
          />
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari kode atau mata kuliah..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data kurikulum"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-tahunAjaran="{ item }">{{ item.tahunAjaran?.nama ?? '-' }}</template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
        <template #cell-kelompokMataKuliah="{ item }">{{ item.kelompokMataKuliah ?? '-' }}</template>
        <template #cell-jenisMataKuliah="{ item }">
          {{ item.jenisMataKuliah ? JENIS_MATA_KULIAH_LABELS[item.jenisMataKuliah] : '-' }}
        </template>
        <template #cell-mataKuliahMinat="{ item }">{{ item.mataKuliahMinat ?? '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Kurikulum' : 'Form Input Data Master Kurikulum'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput v-model="form.tahunAjaranId" label="Tahun Kurikulum" placeholder="-- Pilih Tahun --" :options="tahunAjaranOptions" />
          <SelectInput v-model="form.semester" label="Semester" placeholder="-- Pilih Semester --" :options="SEMESTER_OPTIONS" />
          <SelectInput v-model="form.jurusanId" label="Prodi" placeholder="-- Pilih Prodi --" :options="jurusanOptions" />
        </div>

        <TextInput v-model="form.kode" label="Kode Matakuliah" required :error="errors.kode" />
        <TextareaInput v-model="form.mataKuliah" label="Nama Matakuliah" required :error="errors.mataKuliah" />
        <TextareaInput v-model="form.mataKuliahEn" label="Nama Matakuliah English" />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput
            v-model="form.kelompokMataKuliah"
            label="Kelompok Matakuliah"
            placeholder="-- Pilih Kelompok --"
            :options="kelompokMataKuliahOptions"
          />
          <SelectInput
            v-model="form.kelompokKurikulum"
            label="Kelompok Kurikulum"
            placeholder="-- Status --"
            :options="kelompokKurikulumOptions"
          />
          <SelectInput
            v-model="form.jenisMataKuliah"
            label="Jenis Matakuliah"
            placeholder="-- Pilih Jenis --"
            :options="jenisMataKuliahOptions"
          />
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SelectInput v-model="form.sksTeori" label="SKS Teori" :options="SKS_OPTIONS" />
          <SelectInput v-model="form.sksPraktek" label="SKS Praktek" :options="SKS_OPTIONS" />
          <SelectInput v-model="form.sksLab" label="SKS Lab" :options="SKS_OPTIONS" />
          <SelectInput v-model="form.sksSimulasi" label="SKS Simulasi" :options="SKS_OPTIONS" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput
            v-model="form.kelompokKompetensi"
            label="Kelompok Kompetensi"
            placeholder="-- Status --"
            :options="kelompokKompetensiOptions"
          />
          <SelectInput
            v-model="form.kompIlmuKomputer"
            label="Komp. Ilmu Komputer"
            placeholder="-- Pilih Jenis --"
            :options="kompIlmuKomputerOptions"
          />
          <SelectInput
            v-model="form.mataKuliahMinat"
            label="Matakuliah Minat"
            placeholder="-- Pilih Minat --"
            :options="mataKuliahMinatOptions"
          />
        </div>

        <TextInput v-model="form.muatanMataKuliah" label="Muatan Matakuliah" placeholder="Remark..." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Kurikulum"
      :message="`Yakin ingin menghapus kurikulum ${deleteTarget?.mataKuliah ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
