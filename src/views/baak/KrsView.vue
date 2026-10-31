<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import KrsFilterPanel from '@/components/baak/KrsFilterPanel.vue';
import { emptyKrsFilter, krsFilterQuery } from '@/components/baak/krsFilter';
import { krsApi, type KrsPayload, type KuotaSks } from '@/api/krs';
import { mahasiswaApi } from '@/api/mahasiswa';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { StatusKrs } from '@/types/entities';
import { formatTahunAjaran, withCurrentTahunAjaran } from '@/utils/tahunAjaranOptions';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { openBlob } from '@/utils/download';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KRS_MANAGEMENT);

const STATUS_OPTIONS: { value: Exclude<StatusKrs, 'BELUM_ISI'>; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'DIAJUKAN', label: 'Diajukan' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
];
const statusLabel = (s: StatusKrs) => (s === 'BELUM_ISI' ? 'Belum Isi' : STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s);
const VARIANT_BY_STATUS: Record<StatusKrs, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
  BELUM_ISI: 'danger',
};
const statusVariant = (s: StatusKrs) => VARIANT_BY_STATUS[s];

const filter = ref(emptyKrsFilter());

const {
  items,
  meta,
  page,
  limit,
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
  extraQuery: () => krsFilterQuery(filter.value),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

// Persetujuan massal (hak prerogatif BAAK): centang KRS yang belum disetujui lalu klik Setujui.
const selectedIds = ref<number[]>([]);
const approving = ref(false);
watch(items, () => {
  const ids = new Set(items.value.map((k) => k.id));
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id));
});
const bisaDisetujui = (krs: { status: StatusKrs }) => krs.status !== 'DISETUJUI' && krs.status !== 'BELUM_ISI';
const setujuiTerpilih = async () => {
  const ok = await confirmAction({
    title: `Setujui ${selectedIds.value.length} KRS?`,
    text: 'Status KRS yang dipilih akan diubah menjadi Disetujui.',
    confirmLabel: 'Ya, setujui',
  });
  if (!ok) return;
  approving.value = true;
  try {
    const hasil = await krsApi.setujuiMassal(selectedIds.value);
    if (hasil.dilewati.length) {
      toastError(`${hasil.disetujui} KRS disetujui, ${hasil.dilewati.length} dilewati: ${[...new Set(hasil.dilewati.map((d) => d.alasan))].join('; ')}`);
    } else toastSuccess(`${hasil.disetujui} KRS disetujui`);
    selectedIds.value = [];
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyetujui KRS'));
  } finally {
    approving.value = false;
  }
};

// Cetak seluruh data sesuai filter & pencarian (bukan hanya halaman yang tampil).
const mencetak = ref(false);
const cetak = async () => {
  mencetak.value = true;
  try {
    openBlob(await krsApi.cetak({ ...krsFilterQuery(filter.value), search: search.value.trim() || undefined }));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mencetak KRS'));
  } finally {
    mencetak.value = false;
  }
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
const kelasKuliahOptions = ref<{ value: number; label: string; sks: number | null; luarProdi?: boolean; semesterLain?: boolean }[]>([]);

onMounted(async () => {
  const [mahasiswaResult, tahunAjaranResult] = await Promise.all([
    mahasiswaApi.list({ limit: 1000 }),
    tahunAjaranApi.list({ limit: 100, isActive: true }),
  ]);
  mahasiswaOptions.value = mahasiswaResult.data.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }));
  tahunAjaranOptions.value = tahunAjaranResult.data.map((t) => ({ value: t.id, label: formatTahunAjaran(t) }));
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
  // Pilihan kelas hanya dari prodi mahasiswa yang dipilih, tahun ajaran & semester KRS.
  if (!form.mahasiswaId || !form.tahunAjaranId || !form.semester) {
    kelasKuliahOptions.value = [];
    return;
  }
  loadingKelasKuliah.value = true;
  try {
    const result = await jadwalKuliahApi.list({
      limit: 200,
      tahunAjaranId: form.tahunAjaranId,
      semester: form.semester,
      mahasiswaId: form.mahasiswaId,
    });
    kelasKuliahOptions.value = result.data.map((j) => ({
      value: j.id,
      label: `${j.kelas} - ${j.kodeMataKuliah} - ${j.namaMataKuliah}`,
      sks: j.sks,
    }));
    // Kelas KRS di luar semester terpilih tetap ditampilkan: mata kuliah semester lain (mengulang) atau, bila bukan
    // kelas prodi mahasiswa, ditandai supaya bisa dihapus centangnya.
    const ids = new Set(kelasKuliahOptions.value.map((o) => o.value));
    const lainnya = (editingItem.value?.detailList ?? []).filter((d) => form.jadwalKuliahIds.includes(d.jadwalKuliahId) && !ids.has(d.jadwalKuliahId));
    if (lainnya.length) {
      const semuaSemester = await jadwalKuliahApi.list({ limit: 1000, tahunAjaranId: form.tahunAjaranId, mahasiswaId: form.mahasiswaId });
      const prodiMahasiswa = new Set(semuaSemester.data.map((j) => j.id));
      lainnya.forEach((d) =>
        kelasKuliahOptions.value.push({
          value: d.jadwalKuliahId,
          label: `${d.kelasKuliah?.kelas ?? '-'} - ${d.kelasKuliah?.kodeMataKuliah ?? ''} - ${d.kelasKuliah?.namaMataKuliah ?? ''}`,
          sks: d.kelasKuliah?.sks ?? null,
          luarProdi: !prodiMahasiswa.has(d.jadwalKuliahId),
          semesterLain: prodiMahasiswa.has(d.jadwalKuliahId),
        })
      );
    }
  } finally {
    loadingKelasKuliah.value = false;
  }
};

// Batas SKS: semester 1-2 = 20, semester 3+ = 24 (tidak lagi berdasarkan IP) — lihat pmb-be/src/utils/sksQuota.js.
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
watch(() => [form.mahasiswaId, form.tahunAjaranId, form.semester] as const, loadKelasKuliahOptions);
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
      <div class="p-4 border-b border-outline-variant flex flex-col gap-4 bg-surface-bright">
        <KrsFilterPanel v-model="filter" @change="onFilterChange" />
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
          <AppButton icon="print" :disabled="mencetak" @click="cetak">{{ mencetak ? 'Menyiapkan...' : 'Cetak' }}</AppButton>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
        <PageSizeSelect v-model="limit" />
        <div v-if="canUpdate && selectedIds.length" class="flex items-center gap-3">
          <span class="text-body-sm text-on-surface-variant">{{ selectedIds.length }} KRS dipilih</span>
          <AppButton variant="secondary" @click="selectedIds = []">Batal</AppButton>
          <AppButton icon="check" :disabled="approving" @click="setujuiTerpilih">
            {{ approving ? 'Memproses...' : `Setujui (${selectedIds.length})` }}
          </AppButton>
        </div>
      </div>

      <DataTable
        v-model:selected-ids="selectedIds"
        :columns="columns"
        :items="items"
        :loading="loading"
        :selectable="canUpdate"
        :is-selectable="bisaDisetujui"
        empty-message="Belum ada data KRS"
      >
        <template #cell-mahasiswa="{ item }">
          <p class="font-medium text-on-surface">{{ item.mahasiswa?.nim }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.mahasiswa?.namaLengkap }}</p>
        </template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
        <template #cell-tahunAjaran="{ item }">{{ formatTahunAjaran(item.tahunAjaran) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusLabel(item.status)" :variant="statusVariant(item.status)" />
        </template>
        <template #actions="{ item }">
          <RowActions v-if="item.status !== 'BELUM_ISI'" :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
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
            :options="withCurrentTahunAjaran(tahunAjaranOptions, editingItem?.tahunAjaran)"
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
                dari maksimal {{ kuota.maxSks }} SKS</template
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
                <span v-if="opt.luarProdi" class="text-label-sm text-error">bukan prodi mahasiswa — hapus centang</span>
                <span v-if="opt.semesterLain" class="text-label-sm text-primary">semester lain / mengulang</span>
              </label>
              <p v-if="kelasKuliahOptions.length === 0" class="text-body-sm text-on-surface-variant px-2 py-1.5">
                {{ form.mahasiswaId && form.tahunAjaranId && form.semester ? 'Tidak ada kelas kuliah prodi mahasiswa ini pada tahun ajaran & semester tersebut' : 'Pilih Mahasiswa, Tahun Ajaran, dan Semester untuk menampilkan kelas kuliah yang tersedia' }}
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
