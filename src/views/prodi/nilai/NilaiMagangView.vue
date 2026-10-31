<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import RemoteLookupInput from '@/components/ui/RemoteLookupInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { nilaiMagangApi, type NilaiMagang, type NilaiMagangPayload } from '@/api/nilaiMagang';
import { mahasiswaApi } from '@/api/mahasiswa';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { pembimbingMagangApi } from '@/api/pembimbingMagang';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';
import { formatTahunAjaran, withCurrentTahunAjaran } from '@/utils/tahunAjaranOptions';
import { useProdiContext } from '@/composables/useProdiContext';

const { prodiLocked, prodiPlaceholder } = useProdiContext();

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_NILAI_MAGANG_MANAGEMENT);

// ---- Pilihan dropdown ----
const jurusanOptions = ref<SelectOption[]>([]);
const tahunAjaranOptions = ref<SelectOption[]>([]);
const pembimbingOptions = ref<SelectOption[]>([]);
onMounted(async () => {
  const [jurusan, tahunAjaran, pembimbing] = await Promise.allSettled([
    jurusanApi.listProdi({ limit: 200 }),
    tahunAjaranApi.list({ limit: 100, isActive: true }),
    pembimbingMagangApi.list({ page: 1, limit: 500 }),
  ]);
  if (jurusan.status === 'fulfilled') jurusanOptions.value = jurusan.value.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  if (tahunAjaran.status === 'fulfilled') tahunAjaranOptions.value = tahunAjaran.value.data.map((t) => ({ value: t.id, label: formatTahunAjaran(t) }));
  if (pembimbing.status === 'fulfilled') {
    pembimbingOptions.value = pembimbing.value.data.map((p) => ({ value: p.id, label: p.dosen?.namaLengkap ?? `Pembimbing #${p.id}` }));
  }
});
const SEMESTER_OPTIONS: SelectOption[] = Array.from({ length: 14 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

const searchMahasiswa = async (term: string): Promise<SelectOption[]> => {
  const result = await mahasiswaApi.list({ page: 1, limit: 20, search: term || undefined });
  return result.data.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }));
};

// ---- Tabel ----
const jurusanFilter = ref<number | ''>('');
const tahunAjaranFilter = ref<number | ''>('');

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
} = useCrudPage<NilaiMagang>({
  fetchList: nilaiMagangApi.list,
  remove: nilaiMagangApi.remove,
  extraQuery: () => ({ jurusanId: jurusanFilter.value || undefined, tahunAjaranId: tahunAjaranFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const rows = computed(() => items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 })));

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'Mahasiswa', sortable: true },
  { key: 'judul', label: 'Judul' },
  { key: 'lokasi', label: 'Lokasi', sortable: true },
  { key: 'pembimbing', label: 'Pembimbing' },
  { key: 'periode', label: 'Periode' },
  { key: 'nilai', label: 'Nilai', align: 'center', sortable: true },
  { key: 'grade', label: 'Grade', align: 'center', sortable: true },
];

const periodeLabel = (item: NilaiMagang) => {
  if (!item.tanggalMulai && !item.tanggalSelesai) return '-';
  return `${formatDate(item.tanggalMulai)} – ${formatDate(item.tanggalSelesai)}`;
};

// ---- Form ----
interface FormState {
  mahasiswaId: number | null;
  tahunAjaranId: number | '';
  semester: number | '';
  judul: string;
  lokasi: string;
  alamatLokasi: string;
  emailPerusahaan: string;
  teleponPerusahaan: string;
  pembimbingLapangan: string;
  pembimbingMagangId: number | '';
  tanggalMulai: string;
  tanggalSelesai: string;
  nilai: number | '';
  keterangan: string;
}

const emptyForm = (): FormState => ({
  mahasiswaId: null,
  tahunAjaranId: '',
  semester: '',
  judul: '',
  lokasi: '',
  alamatLokasi: '',
  emailPerusahaan: '',
  teleponPerusahaan: '',
  pembimbingLapangan: '',
  pembimbingMagangId: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  nilai: '',
  keterangan: '',
});

const form = reactive<FormState>(emptyForm());
const mahasiswaLabel = ref('');
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);
const prefilling = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    Object.assign(form, emptyForm());
    mahasiswaLabel.value = '';
    if (!editing) return;
    Object.assign(form, {
      mahasiswaId: editing.mahasiswaId,
      tahunAjaranId: editing.tahunAjaranId ?? '',
      semester: editing.semester ?? '',
      judul: editing.judul,
      lokasi: editing.lokasi,
      alamatLokasi: editing.alamatLokasi ?? '',
      emailPerusahaan: editing.emailPerusahaan ?? '',
      teleponPerusahaan: editing.teleponPerusahaan ?? '',
      pembimbingLapangan: editing.pembimbingLapangan ?? '',
      pembimbingMagangId: editing.pembimbingMagangId ?? '',
      tanggalMulai: editing.tanggalMulai ?? '',
      tanggalSelesai: editing.tanggalSelesai ?? '',
      nilai: editing.nilai ?? '',
      keterangan: editing.keterangan ?? '',
    });
    mahasiswaLabel.value = editing.mahasiswa ? `${editing.mahasiswa.nim} - ${editing.mahasiswa.namaLengkap}` : '';
  },
  { immediate: true }
);

// Saat input baru & mahasiswa dipilih: isi judul + dosen pembimbing dari Bimbingan Magang (kalau field masih kosong).
watch(
  () => form.mahasiswaId,
  async (mahasiswaId) => {
    if (!mahasiswaId || editingItem.value) return;
    prefilling.value = true;
    try {
      const prefill = await nilaiMagangApi.prefill(mahasiswaId);
      if (!form.judul && prefill.judul) form.judul = prefill.judul;
      if (!form.pembimbingMagangId && prefill.pembimbingMagangId) form.pembimbingMagangId = prefill.pembimbingMagangId;
    } catch {
      // Prefill hanya bantuan; abaikan bila gagal.
    } finally {
      prefilling.value = false;
    }
  }
);

// Pratinjau grade (skala sama dengan backend/KHS) supaya Prodi langsung melihat hasil konversinya.
const GRADE_RANGES = [
  { min: 85, grade: 'A' },
  { min: 80, grade: 'A-' },
  { min: 75, grade: 'B+' },
  { min: 70, grade: 'B' },
  { min: 65, grade: 'B-' },
  { min: 60, grade: 'C+' },
  { min: 55, grade: 'C' },
  { min: 45, grade: 'D' },
  { min: 0, grade: 'E' },
];
const gradePreview = computed(() => {
  if (form.nilai === '' || Number.isNaN(Number(form.nilai))) return null;
  return GRADE_RANGES.find((r) => Number(form.nilai) >= r.min)?.grade ?? 'E';
});

const validate = () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (!form.judul.trim()) errors.judul = 'Judul wajib diisi';
  if (!form.lokasi.trim()) errors.lokasi = 'Lokasi wajib diisi';
  if (form.nilai !== '' && (Number(form.nilai) < 0 || Number(form.nilai) > 100)) errors.nilai = 'Nilai harus 0 - 100';
  if (form.tanggalMulai && form.tanggalSelesai && form.tanggalSelesai < form.tanggalMulai) {
    errors.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
  }
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  const payload: NilaiMagangPayload = {
    mahasiswaId: form.mahasiswaId as number,
    tahunAjaranId: form.tahunAjaranId || null,
    semester: form.semester || null,
    judul: form.judul.trim(),
    lokasi: form.lokasi.trim(),
    alamatLokasi: form.alamatLokasi.trim() || null,
    emailPerusahaan: form.emailPerusahaan.trim() || null,
    teleponPerusahaan: form.teleponPerusahaan.trim() || null,
    pembimbingLapangan: form.pembimbingLapangan.trim() || null,
    pembimbingMagangId: form.pembimbingMagangId || null,
    tanggalMulai: form.tanggalMulai || null,
    tanggalSelesai: form.tanggalSelesai || null,
    nilai: form.nilai === '' ? null : Number(form.nilai),
    keterangan: form.keterangan.trim() || null,
  };
  try {
    if (editingItem.value) await nilaiMagangApi.update(editingItem.value.id, payload);
    else await nilaiMagangApi.create(payload);
    toastSuccess('Nilai magang disimpan');
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan nilai magang');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Nilai Magang" subtitle="Input & rekap nilai magang mahasiswa: judul, lokasi, pembimbing, dan nilai.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Input Nilai Magang</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright grid grid-cols-1 md:grid-cols-3 gap-3">
        <SelectInput v-model="jurusanFilter" :placeholder="prodiPlaceholder('Semua Prodi')" :disabled="prodiLocked" :options="jurusanOptions" @change="onFilterChange" />
        <SelectInput v-model="tahunAjaranFilter" placeholder="Semua Tahun Ajaran" :options="tahunAjaranOptions" @change="onFilterChange" />
        <SearchInput v-model="search" placeholder="Cari NIM, nama, judul, lokasi..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        :show-actions="canUpdate || canDelete"
        empty-message="Belum ada data nilai magang"
        @sort="handleSort"
      >
        <template #cell-nim="{ item }">
          <div class="min-w-[10rem]">
            <p class="font-medium">{{ item.mahasiswa?.namaLengkap ?? '-' }}</p>
            <p class="text-label-sm text-on-surface-variant">
              {{ item.mahasiswa?.nim }}<span v-if="item.mahasiswa?.jurusan"> · {{ item.mahasiswa.jurusan.namaJurusan }}</span>
            </p>
          </div>
        </template>
        <template #cell-judul="{ item }"><p class="min-w-[12rem] line-clamp-2" :title="item.judul">{{ item.judul }}</p></template>
        <template #cell-lokasi="{ item }">
          <p class="min-w-[8rem]">{{ item.lokasi }}</p>
          <p v-if="item.emailPerusahaan || item.teleponPerusahaan" class="text-label-sm text-on-surface-variant">
            {{ [item.teleponPerusahaan, item.emailPerusahaan].filter(Boolean).join(' · ') }}
          </p>
        </template>
        <template #cell-pembimbing="{ item }">
          <div class="min-w-[9rem] text-label-sm">
            <p v-if="item.pembimbingMagang?.dosen">Dosen: {{ item.pembimbingMagang.dosen.namaLengkap }}</p>
            <p v-if="item.pembimbingLapangan" class="text-on-surface-variant">Lapangan: {{ item.pembimbingLapangan }}</p>
            <p v-if="!item.pembimbingMagang?.dosen && !item.pembimbingLapangan">-</p>
          </div>
        </template>
        <template #cell-periode="{ item }"><span class="whitespace-nowrap text-label-sm">{{ periodeLabel(item) }}</span></template>
        <template #cell-nilai="{ item }"><span class="tabular-nums">{{ item.nilai ?? '-' }}</span></template>
        <template #cell-grade="{ item }"><span class="font-semibold">{{ item.grade ?? '-' }}</span></template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Nilai Magang' : 'Input Nilai Magang'" size="lg" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>

        <div>
          <RemoteLookupInput
            v-model="form.mahasiswaId"
            label="Mahasiswa"
            required
            placeholder="Ketik NIM atau nama mahasiswa..."
            :initial-label="mahasiswaLabel"
            :search="searchMahasiswa"
          />
          <p v-if="errors.mahasiswaId" class="mt-1 text-label-sm text-error">{{ errors.mahasiswaId }}</p>
          <p v-else-if="prefilling" class="mt-1 text-label-sm text-on-surface-variant">Mengambil data bimbingan magang...</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.tahunAjaranId" label="Tahun Ajaran" placeholder="-- Pilih Tahun Ajaran --" :options="withCurrentTahunAjaran(tahunAjaranOptions, editingItem?.tahunAjaran)" />
          <SelectInput v-model="form.semester" label="Semester" placeholder="-- Pilih Semester --" :options="SEMESTER_OPTIONS" />
        </div>

        <TextareaInput v-model="form.judul" label="Judul Magang / Laporan" required :rows="2" :error="errors.judul" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.lokasi" label="Lokasi / Instansi" required placeholder="mis. RSUD Kota Bekasi" :error="errors.lokasi" />
          <TextInput v-model="form.pembimbingLapangan" label="Pembimbing Lapangan" placeholder="Nama pembimbing di instansi" />
        </div>
        <TextareaInput v-model="form.alamatLokasi" label="Alamat Lokasi" :rows="2" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.emailPerusahaan" label="E-Mail Perusahaan" type="email" />
          <TextInput v-model="form.teleponPerusahaan" label="Telepon Perusahaan" type="tel" />
        </div>

        <SelectInput
          v-model="form.pembimbingMagangId"
          label="Dosen Pembimbing"
          placeholder="-- Pilih Dosen Pembimbing --"
          :options="pembimbingOptions"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalMulai" label="Tanggal Mulai" />
          <DateInput v-model="form.tanggalSelesai" label="Tanggal Selesai" :error="errors.tanggalSelesai" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <TextInput v-model.number="form.nilai" label="Nilai (0 - 100)" type="number" step="0.01" :error="errors.nilai" />
          <div>
            <span class="block font-medium text-label-md text-on-surface mb-2">Grade</span>
            <div class="px-3 py-2 border border-outline-variant rounded-md bg-surface-container text-body-md font-semibold">
              {{ gradePreview ?? '-' }}
            </div>
            <p class="mt-1 text-label-sm text-on-surface-variant">Dihitung otomatis dari nilai.</p>
          </div>
        </div>

        <TextareaInput v-model="form.keterangan" label="Keterangan" :rows="2" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Nilai Magang"
      :message="`Yakin ingin menghapus nilai magang ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
