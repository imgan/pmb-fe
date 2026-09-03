<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { krsApi, type KrsPayload, type KuotaSks } from '@/api/krs';
import { mahasiswaApi } from '@/api/mahasiswa';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { StatusKrs } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KRS_MANAGEMENT);

const STATUS_OPTIONS: { value: StatusKrs; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'DIAJUKAN', label: 'Diajukan' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
];
const statusLabel = (s: StatusKrs) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
const VARIANT_BY_STATUS: Record<StatusKrs, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};
const statusVariant = (s: StatusKrs) => VARIANT_BY_STATUS[s];

const tahunAjaranFilter = ref<number | ''>('');
const semesterFilter = ref<number | ''>('');
const statusFilter = ref<StatusKrs | ''>('');

const {
  items,
  meta,
  page,
  search,
  loading,
  error,
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
  fetchList: krsApi.list,
  remove: krsApi.remove,
  extraQuery: () => ({
    tahunAjaranId: tahunAjaranFilter.value || undefined,
    semester: semesterFilter.value || undefined,
    status: statusFilter.value || undefined,
  }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'mahasiswa', label: 'Mahasiswa' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'tahunAjaran', label: 'Tahun Ajaran' },
  { key: 'totalSks', label: 'Total SKS', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
];

const mahasiswaOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const kelasKuliahOptions = ref<{ value: number; label: string; sks: number | null }[]>([]);

onMounted(async () => {
  const [mahasiswaResult, tahunAjaranResult] = await Promise.all([
    mahasiswaApi.list({ limit: 200 }),
    tahunAjaranApi.list({ limit: 100 }),
  ]);
  mahasiswaOptions.value = mahasiswaResult.data.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }));
  tahunAjaranOptions.value = tahunAjaranResult.data.map((t) => ({ value: t.id, label: t.nama }));
});

const form = reactive({
  mahasiswaId: '' as number | '',
  semester: 1 as number | '',
  tahunAjaranId: '' as number | '',
  status: 'DRAFT' as StatusKrs,
  jadwalKuliahIds: [] as number[],
});
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);
const loadingKelasKuliah = ref(false);
const kuota = ref<KuotaSks | null>(null);

const loadKelasKuliahOptions = async () => {
  if (!form.tahunAjaranId || !form.semester) {
    kelasKuliahOptions.value = [];
    return;
  }
  loadingKelasKuliah.value = true;
  try {
    const result = await jadwalKuliahApi.list({
      limit: 200,
      tahunAjaranId: form.tahunAjaranId,
      semester: form.semester,
    });
    kelasKuliahOptions.value = result.data.map((j) => ({
      value: j.id,
      label: `${j.kelas} - ${j.kodeMataKuliah} - ${j.namaMataKuliah}`,
      sks: j.sks,
    }));
  } finally {
    loadingKelasKuliah.value = false;
  }
};

// null maxSks berarti mahasiswa belum punya riwayat nilai semester sebelumnya (mis. semester
// 1), jadi belum bisa dihitung dan tidak dibatasi — lihat pmb-be/src/utils/sksQuota.js.
const loadKuota = async () => {
  if (!form.mahasiswaId || !form.semester) {
    kuota.value = null;
    return;
  }
  try {
    kuota.value = await krsApi.kuota(Number(form.mahasiswaId), Number(form.semester));
  } catch {
    kuota.value = null;
  }
};

// Kelas kuliah yang bisa dipilih HARUS difilter juga per semester, bukan cuma tahun ajaran —
// kalau tidak, admin BAAK bisa memasukkan mata kuliah semester lain ke KRS, sehingga datanya
// tidak sinkron dengan yang mahasiswa lihat di modul KRS mereka sendiri (yang memang difilter
// per semester lewat listJadwalTersedia).
watch(() => [form.tahunAjaranId, form.semester] as const, loadKelasKuliahOptions);
watch(() => [form.mahasiswaId, form.semester] as const, loadKuota);

const selectedTotalSks = computed(() =>
  kelasKuliahOptions.value
    .filter((o) => form.jadwalKuliahIds.includes(o.value))
    .reduce((sum, o) => sum + (o.sks ?? 0), 0)
);

const isOverQuota = computed(() => kuota.value?.maxSks != null && selectedTotalSks.value > kuota.value.maxSks);

// Dicek juga di server saat submit (assertSksQuota) — pengecekan di sini semata untuk
// mencegah human error/penyalahgunaan saat admin BAAK memasukkan KRS mahasiswa secara manual,
// bukan pengganti validasi backend.
const wouldExceedQuota = (opt: { value: number; sks: number | null }) =>
  kuota.value?.maxSks != null &&
  !form.jadwalKuliahIds.includes(opt.value) &&
  selectedTotalSks.value + (opt.sks ?? 0) > kuota.value.maxSks;

const toggleKelasKuliah = (opt: { value: number; sks: number | null }) => {
  if (wouldExceedQuota(opt)) return;
  const idx = form.jadwalKuliahIds.indexOf(opt.value);
  if (idx === -1) form.jadwalKuliahIds.push(opt.value);
  else form.jadwalKuliahIds.splice(idx, 1);
};

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    kuota.value = null;
    form.mahasiswaId = editing?.mahasiswaId ?? '';
    form.semester = editing?.semester ?? 1;
    form.tahunAjaranId = editing?.tahunAjaranId ?? '';
    form.status = editing?.status ?? 'DRAFT';
    form.jadwalKuliahIds = (editing?.detailList ?? []).map((d) => d.jadwalKuliahId);
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (!form.semester) errors.semester = 'Semester wajib diisi';
  if (!form.tahunAjaranId) errors.tahunAjaranId = 'Tahun ajaran wajib dipilih';
  if (Object.keys(errors).length > 0) return;
  if (isOverQuota.value) {
    formError.value = `Total SKS yang dipilih (${selectedTotalSks.value}) melebihi kuota maksimal ${kuota.value?.maxSks} SKS`;
    return;
  }

  submitting.value = true;
  formError.value = null;
  try {
    const payload: KrsPayload = {
      mahasiswaId: Number(form.mahasiswaId),
      semester: Number(form.semester),
      tahunAjaranId: Number(form.tahunAjaranId),
      status: form.status,
      jadwalKuliahIds: form.jadwalKuliahIds,
    };
    if (editingItem.value) {
      await krsApi.update(editingItem.value.id, payload);
    } else {
      await krsApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan KRS');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="KRS Mahasiswa" subtitle="Kartu Rencana Studi — kelas kuliah yang diambil mahasiswa per semester.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah KRS</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
        <div class="flex flex-col md:flex-row gap-3">
          <div class="w-full md:w-52">
            <SelectInput
              v-model="tahunAjaranFilter"
              placeholder="Semua Tahun Ajaran"
              :options="tahunAjaranOptions"
              @change="onFilterChange"
            />
          </div>
          <div class="w-full md:w-40">
            <TextInput v-model.number="semesterFilter" type="number" placeholder="Semester" @change="onFilterChange" />
          </div>
          <div class="w-full md:w-44">
            <SelectInput
              v-model="statusFilter"
              placeholder="Semua Status"
              :options="STATUS_OPTIONS"
              @change="onFilterChange"
            />
          </div>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" empty-message="Belum ada data KRS">
        <template #cell-mahasiswa="{ item }">
          <p class="font-medium text-on-surface">{{ item.mahasiswa?.nim }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.mahasiswa?.namaLengkap }}</p>
        </template>
        <template #cell-tahunAjaran="{ item }">{{ item.tahunAjaran?.nama ?? '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusLabel(item.status)" :variant="statusVariant(item.status)" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah KRS' : 'Tambah KRS'" size="lg" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <SearchableSelect
          v-model="form.mahasiswaId"
          label="Mahasiswa"
          required
          placeholder="Pilih mahasiswa..."
          search-placeholder="Cari NIM atau nama mahasiswa..."
          :options="mahasiswaOptions"
          :disabled="!!editingItem"
          :error="errors.mahasiswaId"
        />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput v-model.number="form.semester" label="Semester" type="number" required :error="errors.semester" />
          <SelectInput
            v-model="form.tahunAjaranId"
            label="Tahun Ajaran"
            required
            placeholder="Pilih tahun ajaran..."
            :options="tahunAjaranOptions"
            :disabled="!!editingItem"
            :error="errors.tahunAjaranId"
          />
          <SelectInput v-model="form.status" label="Status" :options="STATUS_OPTIONS" />
        </div>

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Kelas Kuliah
            <span :class="isOverQuota ? 'text-error font-semibold' : 'text-on-surface-variant font-normal'">
              (Total {{ selectedTotalSks }} SKS<template v-if="kuota?.maxSks != null">
                dari maksimal {{ kuota.maxSks }} SKS &middot; IP semester lalu {{ kuota.ipSemesterSebelumnya?.toFixed(2) }}</template
              >)
            </span>
          </span>
          <div class="border border-outline-variant rounded-md max-h-56 overflow-y-auto p-2 space-y-1">
            <p v-if="loadingKelasKuliah" class="text-body-sm text-on-surface-variant px-2 py-1.5">Memuat kelas kuliah...</p>
            <template v-else>
              <label
                v-for="opt in kelasKuliahOptions"
                :key="opt.value"
                class="flex items-center gap-2 px-2 py-1.5 rounded text-body-sm text-on-surface"
                :class="wouldExceedQuota(opt) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-container'"
              >
                <input
                  type="checkbox"
                  :checked="form.jadwalKuliahIds.includes(opt.value)"
                  :disabled="wouldExceedQuota(opt)"
                  @change="toggleKelasKuliah(opt)"
                />
                {{ opt.label }} <span class="text-on-surface-variant">[{{ opt.sks ?? 0 }} sks]</span>
              </label>
              <p v-if="kelasKuliahOptions.length === 0" class="text-body-sm text-on-surface-variant px-2 py-1.5">
                Pilih Tahun Ajaran dan Semester untuk menampilkan kelas kuliah yang tersedia
              </p>
            </template>
          </div>
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting || isOverQuota" @click="handleSubmit">
          {{ submitting ? 'Menyimpan...' : 'Simpan' }}
        </AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus KRS"
      :message="`Yakin ingin menghapus KRS ${deleteTarget?.mahasiswa?.namaLengkap ?? ''} semester ${deleteTarget?.semester ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
