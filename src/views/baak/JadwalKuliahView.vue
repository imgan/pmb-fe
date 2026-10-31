<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import ExportJadwalV2Button from '@/components/ui/ExportJadwalV2Button.vue';
import { jadwalKuliahApi, type JadwalKuliahPayload, type MatakuliahAktifOption } from '@/api/jadwalKuliah';
import { dosenApi } from '@/api/dosen';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { HariKuliah } from '@/types/entities';
import { formatTahunAjaran, withCurrentTahunAjaran } from '@/utils/tahunAjaranOptions';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.JADWAL_KULIAH_MANAGEMENT);

const dosenOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranAktifOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const [dosenResult, tahunAjaranResult] = await Promise.all([
    dosenApi.list({ limit: 200 }),
    tahunAjaranApi.list({ limit: 100, isActive: true }),
  ]);
  dosenOptions.value = dosenResult.data.map((d) => ({ value: d.id, label: d.namaLengkap }));
  tahunAjaranAktifOptions.value = tahunAjaranResult.data.map((t) => ({ value: t.id, label: formatTahunAjaran(t) }));
});

// Pilihan mata kuliah = Matakuliah Aktif (menu Prodi) pada tahun ajaran jadwal; bisa berisi mata
// kuliah dari beberapa tahun kurikulum sekaligus.
const matakuliahAktifList = ref<MatakuliahAktifOption[]>([]);
const loadingMatakuliah = ref(false);
const loadMatakuliahAktif = async (tahunAjaranId: number | '') => {
  matakuliahAktifList.value = [];
  if (!tahunAjaranId) return;
  loadingMatakuliah.value = true;
  try {
    matakuliahAktifList.value = await jadwalKuliahApi.matakuliahOptions(Number(tahunAjaranId));
    // Saat edit: cocokkan jadwal tersimpan (kurikulum + semester) ke aktivasinya.
    if (form.mataKuliahId && !form.matakuliahAktifId) {
      const match = matakuliahAktifList.value.find(
        (mk) => mk.mataKuliahId === form.mataKuliahId && mk.semester === form.semester
      );
      if (match) form.matakuliahAktifId = match.id;
    }
  } finally {
    loadingMatakuliah.value = false;
  }
};
const matakuliahAktifOptions = computed(() =>
  matakuliahAktifList.value.map((mk) => ({
    value: mk.id,
    label: `Smt ${mk.semester} · ${mk.kode} - ${mk.mataKuliah} · Kurikulum ${mk.tahunKurikulum ?? '-'}${mk.prodi ? ` · ${mk.prodi}` : ''}`,
  }))
);

const HARI_OPTIONS: { value: HariKuliah; label: string }[] = [
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
];

const statusFilter = ref<'' | 'true' | 'false'>('');
const statusFilterOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' },
];

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
  fetchList: jadwalKuliahApi.list,
  remove: jadwalKuliahApi.remove,
  extraQuery: () => ({ isActive: statusFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'kelas', label: 'Kelas', sortable: true },
  { key: 'kodeMataKuliah', label: 'Kode Mata Kuliah', sortable: true },
  { key: 'namaMataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'tahunAjaran', label: 'Tahun Ajaran' },
  { key: 'dosenKordinator', label: 'Dosen Kordinator', sortable: true },
  { key: 'dosenPengampu', label: 'Dosen Pengampu' },
  { key: 'hari', label: 'Hari' },
  { key: 'jam', label: 'Jam', align: 'center', sortable: true },
  { key: 'ruangan', label: 'Ruangan', sortable: true },
  { key: 'gcr', label: 'GCR' },
  { key: 'status', label: 'Status', align: 'center' },
];

const hariLabel = (hari: HariKuliah[] | null) => {
  if (!hari || hari.length === 0) return '-';
  return hari.map((h) => HARI_OPTIONS.find((o) => o.value === h)?.label ?? h).join(', ');
};

interface JadwalKuliahFormState {
  kelas: string;
  mataKuliahId: number | '';
  matakuliahAktifId: number | '';
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | '';
  semester: number | '';
  dosenKordinatorId: number | '';
  tahunAjaranId: number | '';
  dosenPengampuIds: number[];
  /** SKS yang diberikan ke tiap dosen pengampu, key = dosenId. */
  dosenPengampuSks: Record<number, number | ''>;
  hari: HariKuliah[];
  jam: number | '';
  ruangan: string;
  gcr: string;
  isActive: boolean;
}

const emptyForm = (): JadwalKuliahFormState => ({
  kelas: '',
  mataKuliahId: '',
  matakuliahAktifId: '',
  kodeMataKuliah: '',
  namaMataKuliah: '',
  sks: '',
  semester: '',
  dosenKordinatorId: '',
  tahunAjaranId: '',
  dosenPengampuIds: [],
  dosenPengampuSks: {},
  hari: [],
  jam: '',
  ruangan: '',
  gcr: '',
  isActive: true,
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
      form.kelas = editing.kelas;
      form.mataKuliahId = editing.mataKuliahId ?? '';
      form.kodeMataKuliah = editing.kodeMataKuliah;
      form.namaMataKuliah = editing.namaMataKuliah;
      form.sks = editing.sks ?? '';
      form.semester = editing.semester ?? '';
      form.dosenKordinatorId = editing.dosenKordinatorId;
      form.tahunAjaranId = editing.tahunAjaranId ?? '';
      form.dosenPengampuIds = editing.dosenPengampu?.map((d) => d.id) ?? [];
      form.dosenPengampuSks = Object.fromEntries(
        (editing.dosenPengampu ?? []).map((d) => [d.id, d.JadwalKuliahDosenPengampu?.sks ?? ''])
      );
      form.hari = editing.hari ?? [];
      form.jam = editing.jam ?? '';
      form.ruangan = editing.ruangan ?? '';
      form.gcr = editing.gcr ?? '';
      form.isActive = editing.isActive;
    }
  },
  { immediate: true }
);

// Ruangan dipilih dari Master Ruangan (Modul Admin), dimuat ulang tiap form dibuka. Isian lama yang
// belum ada di master tetap ditampilkan supaya tidak hilang saat jadwal disimpan ulang.
const ruanganMaster = ref<SelectOption[]>([]);
watch(isFormOpen, async (open) => {
  if (!open) return;
  try {
    ruanganMaster.value = await jadwalKuliahApi.ruanganOptions();
  } catch {
    ruanganMaster.value = [];
  }
});
const ruanganOptions = computed<SelectOption[]>(() => {
  const lama = editingItem.value?.ruangan;
  if (!lama || ruanganMaster.value.some((o) => o.value === lama)) return ruanganMaster.value;
  return [...ruanganMaster.value, { value: lama, label: `${lama} (isian lama, belum ada di Master Ruangan)` }];
});

watch(
  () => [isFormOpen.value, form.tahunAjaranId] as const,
  ([open, tahunAjaranId], previous) => {
    if (!open) return;
    if (previous && previous[0] && previous[1] !== tahunAjaranId) form.matakuliahAktifId = '';
    loadMatakuliahAktif(tahunAjaranId);
  }
);

watch(
  () => form.matakuliahAktifId,
  (id) => {
    const found = matakuliahAktifList.value.find((mk) => mk.id === id);
    if (!found) return;
    form.mataKuliahId = found.mataKuliahId;
    form.kodeMataKuliah = found.kode;
    form.namaMataKuliah = found.mataKuliah;
    form.sks = found.sksTotal;
    form.semester = found.semester;
  }
);

const togglePengampu = (dosenId: number) => {
  const idx = form.dosenPengampuIds.indexOf(dosenId);
  if (idx === -1) form.dosenPengampuIds.push(dosenId);
  else {
    form.dosenPengampuIds.splice(idx, 1);
    delete form.dosenPengampuSks[dosenId];
  }
};

const totalSksPengampu = computed(() =>
  form.dosenPengampuIds.reduce((sum, id) => sum + (Number(form.dosenPengampuSks[id]) || 0), 0)
);

const formatSks = (sks: number) => sks.toLocaleString('id-ID', { maximumFractionDigits: 2 });

const toggleHari = (hari: HariKuliah) => {
  const idx = form.hari.indexOf(hari);
  if (idx === -1) form.hari.push(hari);
  else form.hari.splice(idx, 1);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kelas.trim()) errors.kelas = 'Kelas wajib diisi';
  // Jadwal lama (sebelum Matakuliah Aktif) boleh tetap tanpa mataKuliahId selama kode MK-nya ada.
  if (!form.matakuliahAktifId && !(editingItem.value && !form.mataKuliahId && form.kodeMataKuliah)) errors.mataKuliahId = 'Pilih mata kuliah dari Matakuliah Aktif';
  if (!form.dosenKordinatorId) errors.dosenKordinatorId = 'Dosen kordinator wajib dipilih';
  if (!form.tahunAjaranId) errors.tahunAjaranId = 'Tahun ajaran wajib dipilih';
  if (form.dosenPengampuIds.some((id) => Number(form.dosenPengampuSks[id]) < 0)) errors.dosenPengampu = 'SKS dosen pengampu tidak boleh negatif';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: JadwalKuliahPayload = {
      kelas: form.kelas.trim(),
      ...(form.mataKuliahId ? { mataKuliahId: Number(form.mataKuliahId) } : {}),
      kodeMataKuliah: form.kodeMataKuliah.trim(),
      namaMataKuliah: form.namaMataKuliah.trim(),
      sks: form.sks === '' ? null : Number(form.sks),
      semester: form.semester === '' ? null : Number(form.semester),
      dosenKordinatorId: Number(form.dosenKordinatorId),
      tahunAjaranId: Number(form.tahunAjaranId),
      dosenPengampu: form.dosenPengampuIds.map((dosenId) => {
        const sks = form.dosenPengampuSks[dosenId];
        return { dosenId, sks: sks === '' || sks === undefined ? null : Number(sks) };
      }),
      hari: form.hari.length ? form.hari : null,
      jam: form.jam === '' ? null : Number(form.jam),
      ruangan: form.ruangan.trim() || null,
      gcr: form.gcr.trim() || null,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await jadwalKuliahApi.update(editingItem.value.id, payload);
    } else {
      await jadwalKuliahApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan jadwal kuliah');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Jadwal Kuliah" subtitle="Kelola jadwal perkuliahan per kelas dan mata kuliah.">
      <template #actions>
        <ImportExportButtons
          :export-fn="jadwalKuliahApi.exportExcel"
          :import-fn="jadwalKuliahApi.importExcel"
          :template-fn="jadwalKuliahApi.importTemplate"
          :can-import="canCreate"
          filename="jadwal-kuliah.xlsx"
          template-filename="template-import-jadwal-kuliah.xlsx"
          @imported="fetchItems"
        />
        <ExportJadwalV2Button />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari kelas, kode, atau mata kuliah..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="statusFilterOptions" @change="onFilterChange" />
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
        empty-message="Belum ada data jadwal kuliah"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-namaMataKuliah="{ item }">
          {{ item.namaMataKuliah }}
          <span v-if="item.sks !== null" class="text-on-surface-variant">[ {{ item.sks }} ]</span>
        </template>
        <template #cell-tahunAjaran="{ item }">{{ formatTahunAjaran(item.tahunAjaran) }}</template>
        <template #cell-dosenKordinator="{ item }">{{ item.dosenKordinator?.namaLengkap ?? '-' }}</template>
        <template #cell-dosenPengampu="{ item }">
          <template v-if="item.dosenPengampu && item.dosenPengampu.length">
            <p v-for="d in item.dosenPengampu" :key="d.id" class="whitespace-nowrap">
              {{ d.namaLengkap }}
              <span v-if="d.JadwalKuliahDosenPengampu?.sks != null" class="text-on-surface-variant">
                ({{ formatSks(d.JadwalKuliahDosenPengampu.sks) }} SKS)
              </span>
            </p>
          </template>
          <span v-else>-</span>
        </template>
        <template #cell-hari="{ item }">{{ hariLabel(item.hari) }}</template>
        <template #cell-jam="{ item }">{{ item.jam ?? '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan || '-' }}</template>
        <template #cell-gcr="{ item }">{{ item.gcr || '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Non-aktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Jadwal Kuliah' : 'Tambah Jadwal Kuliah'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.kelas" label="Kelas" required placeholder="mis. TI4AM" :error="errors.kelas" />
          <TextInput v-model.number="form.sks" label="SKS" type="number" disabled />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableSelect
              v-model="form.matakuliahAktifId"
              label="Mata Kuliah (Matakuliah Aktif)"
              required
              :placeholder="!form.tahunAjaranId ? 'Pilih tahun ajaran dulu' : loadingMatakuliah ? 'Memuat...' : 'Pilih mata kuliah...'"
              search-placeholder="Cari kode/nama mata kuliah..."
              :options="matakuliahAktifOptions"
              :disabled="!form.tahunAjaranId"
              :error="errors.mataKuliahId"
            />
            <p v-if="form.tahunAjaranId && !loadingMatakuliah && !matakuliahAktifList.length" class="mt-1 text-label-sm text-on-surface-variant">
              Belum ada mata kuliah aktif untuk tahun ajaran ini. Aktifkan dulu di menu Prodi &rsaquo; Matakuliah Aktif.
            </p>
            <p v-else-if="editingItem && !form.mataKuliahId" class="mt-1 text-label-sm text-on-surface-variant">
              Jadwal lama: {{ form.kodeMataKuliah }} belum terhubung ke Matakuliah Aktif.
            </p>
          </div>
          <TextInput v-model="form.namaMataKuliah" label="Nama Mata Kuliah" disabled />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.semester" label="Semester" type="number" disabled />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            v-model="form.dosenKordinatorId"
            label="Dosen Kordinator"
            required
            placeholder="Pilih dosen kordinator..."
            search-placeholder="Cari dosen..."
            :options="dosenOptions"
            :error="errors.dosenKordinatorId"
          />
          <SelectInput
            v-model="form.tahunAjaranId"
            label="Tahun Ajaran"
            required
            placeholder="Pilih tahun ajaran..."
            :options="withCurrentTahunAjaran(tahunAjaranAktifOptions, editingItem?.tahunAjaran)"
            :error="errors.tahunAjaranId"
          />
        </div>

        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Dosen Pengampu</span>
          <div class="border border-outline-variant rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
            <div
              v-for="opt in dosenOptions"
              :key="opt.value"
              class="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-container text-body-sm text-on-surface"
            >
              <label class="flex flex-1 min-w-0 items-center gap-2 py-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="form.dosenPengampuIds.includes(opt.value)"
                  @change="togglePengampu(opt.value)"
                />
                <span class="truncate">{{ opt.label }}</span>
              </label>
              <label v-if="form.dosenPengampuIds.includes(opt.value)" class="flex shrink-0 items-center gap-1.5">
                <input
                  v-model="form.dosenPengampuSks[opt.value]"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  class="w-20 px-2 py-1 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span class="text-label-sm text-on-surface-variant">SKS</span>
              </label>
            </div>
            <p v-if="dosenOptions.length === 0" class="text-body-sm text-on-surface-variant px-2 py-1.5">Belum ada data dosen</p>
          </div>
          <p v-if="errors.dosenPengampu" class="mt-1 text-label-sm text-error">{{ errors.dosenPengampu }}</p>
          <p v-else-if="form.dosenPengampuIds.length" class="mt-1 text-label-sm text-on-surface-variant">
            Total SKS dosen pengampu: {{ formatSks(totalSksPengampu) }}<template v-if="form.sks !== ''"> dari {{ form.sks }} SKS mata kuliah</template>
          </p>
        </div>

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Hari</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in HARI_OPTIONS"
              :key="opt.value"
              type="button"
              class="px-3 py-1.5 rounded-full border text-label-sm transition-colors"
              :class="
                form.hari.includes(opt.value)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
              "
              @click="toggleHari(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </label>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.jam" label="Jam Ke-" type="number" />
          <SelectInput
            :model-value="form.ruangan"
            label="Ruangan"
            placeholder="Pilih ruangan..."
            :options="ruanganOptions"
            @update:model-value="form.ruangan = String($event ?? '')"
          />
        </div>
        <TextInput v-model="form.gcr" label="GCR" placeholder="Kode/tautan Google Classroom" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Jadwal Kuliah"
      :message="`Yakin ingin menghapus jadwal ${deleteTarget?.namaMataKuliah ?? ''} (${deleteTarget?.kelas ?? ''})?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
