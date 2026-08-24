<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { suratKeteranganApi, type SuratKeteranganPayload } from '@/api/suratKeterangan';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { JenisSurat, SuratKeteranganCetakData } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.LAPORAN_CETAK_SURAT_MANAGEMENT);

const JENIS_SURAT_OPTIONS: { value: JenisSurat; label: string }[] = [
  { value: 'AKTIF_KULIAH', label: 'Surat Keterangan Aktif Kuliah' },
  { value: 'LULUS_MENUNGGU_IJAZAH', label: 'Surat Keterangan Lulus Menunggu Ijazah dan Transkrip' },
  { value: 'OBSERVASI', label: 'Surat Observasi' },
  { value: 'KKP', label: 'Surat Kuliah Kerja Praktek (KKP)' },
  { value: 'REKOMENDASI_KAMPUS_MERDEKA', label: 'Surat Rekomendasi Kampus Merdeka' },
  { value: 'UJIAN_UAS', label: 'Surat Keterangan Mengikuti Ujian UAS' },
];
const INSTANSI_JENIS: JenisSurat[] = ['OBSERVASI', 'KKP'];
const KAMPUS_MERDEKA_JENIS: JenisSurat = 'REKOMENDASI_KAMPUS_MERDEKA';
const UJIAN_UAS_JENIS: JenisSurat = 'UJIAN_UAS';
const jenisSuratLabel = (jenis: JenisSurat) => JENIS_SURAT_OPTIONS.find((o) => o.value === jenis)?.label ?? jenis;

const mahasiswaOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 200 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }));
});

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
  fetchList: suratKeteranganApi.list,
  remove: suratKeteranganApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'namaSurat', label: 'Nama Surat' },
  { key: 'tanggalInput', label: 'Tanggal Input', sortable: true },
  { key: 'nomorSurat', label: 'Nomor Surat', sortable: true },
  { key: 'alasan', label: 'Alasan' },
];

interface SuratFormState {
  mahasiswaId: number | '';
  jenisSurat: JenisSurat | '';
  nomorSurat: string;
  tanggalInput: string;
  semester: number | '';
  alasan: string;
  namaInstansi: string;
  alamatInstansi: string;
  ipk: number | '';
  jumlahSks: number | '';
  namaKoordinator: string;
  noHpKoordinator: string;
  tanggalUjianMulai: string;
  tanggalUjianSelesai: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): SuratFormState => ({
  mahasiswaId: '',
  jenisSurat: '',
  nomorSurat: '',
  tanggalInput: todayIso(),
  semester: '',
  alasan: '',
  namaInstansi: '',
  alamatInstansi: '',
  ipk: '',
  jumlahSks: '',
  namaKoordinator: '',
  noHpKoordinator: '',
  tanggalUjianMulai: '',
  tanggalUjianSelesai: '',
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
      form.mahasiswaId = editing.mahasiswaId;
      form.jenisSurat = editing.jenisSurat;
      form.nomorSurat = editing.nomorSurat ?? '';
      form.tanggalInput = editing.tanggalInput.slice(0, 10);
      form.semester = editing.semester ?? '';
      form.alasan = editing.alasan ?? '';
      form.namaInstansi = editing.namaInstansi ?? '';
      form.alamatInstansi = editing.alamatInstansi ?? '';
      form.ipk = editing.ipk ?? '';
      form.jumlahSks = editing.jumlahSks ?? '';
      form.namaKoordinator = editing.namaKoordinator ?? '';
      form.noHpKoordinator = editing.noHpKoordinator ?? '';
      form.tanggalUjianMulai = editing.tanggalUjianMulai?.slice(0, 10) ?? '';
      form.tanggalUjianSelesai = editing.tanggalUjianSelesai?.slice(0, 10) ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (!form.jenisSurat) errors.jenisSurat = 'Nama surat wajib dipilih';
  if (!form.tanggalInput) errors.tanggalInput = 'Tanggal input wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: SuratKeteranganPayload = {
      mahasiswaId: Number(form.mahasiswaId),
      jenisSurat: form.jenisSurat as JenisSurat,
      nomorSurat: form.nomorSurat.trim() || null,
      tanggalInput: form.tanggalInput,
      semester: form.semester === '' ? null : Number(form.semester),
      alasan: form.alasan.trim() || null,
      namaInstansi: form.namaInstansi.trim() || null,
      alamatInstansi: form.alamatInstansi.trim() || null,
      ipk: form.ipk === '' ? null : Number(form.ipk),
      jumlahSks: form.jumlahSks === '' ? null : Number(form.jumlahSks),
      namaKoordinator: form.namaKoordinator.trim() || null,
      noHpKoordinator: form.noHpKoordinator.trim() || null,
      tanggalUjianMulai: form.tanggalUjianMulai || null,
      tanggalUjianSelesai: form.tanggalUjianSelesai || null,
    };
    if (editingItem.value) {
      await suratKeteranganApi.update(editingItem.value.id, payload);
    } else {
      await suratKeteranganApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan surat keterangan');
  } finally {
    submitting.value = false;
  }
};

// ---- View (pengecekan data sebelum cetak) ----
const isViewOpen = ref(false);
const viewLoading = ref(false);
const viewError = ref<string | null>(null);
const viewData = ref<SuratKeteranganCetakData | null>(null);

const openView = async (id: number) => {
  isViewOpen.value = true;
  viewData.value = null;
  viewError.value = null;
  viewLoading.value = true;
  try {
    viewData.value = await suratKeteranganApi.cetakData(id);
  } catch (err) {
    viewError.value = extractErrorMessage(err, 'Gagal memuat data pengecekan');
  } finally {
    viewLoading.value = false;
  }
};
const closeView = () => {
  isViewOpen.value = false;
};

// ---- Cetak PDF ----
const printingId = ref<number | null>(null);
const handleCetakPdf = async (id: number) => {
  printingId.value = id;
  try {
    const blob = await suratKeteranganApi.cetakPdf(id);
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen'));
  } finally {
    if (printingId.value === id) printingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Cetak Surat" subtitle="Kelola dan cetak surat keterangan mahasiswa.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <div class="mb-4 px-4 py-2.5 rounded-md bg-error-container text-on-error-container text-body-sm text-center font-medium">
      # LAKUKAN PENGECEKAN TERLEBIH DAHULU DENGAN [Click View] #
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data surat keterangan"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-namaSurat="{ item }">{{ jenisSuratLabel(item.jenisSurat) }}</template>
        <template #cell-tanggalInput="{ item }">{{ formatDate(item.tanggalInput) }}</template>
        <template #cell-nomorSurat="{ item }">{{ item.nomorSurat || '-' }}</template>
        <template #cell-alasan="{ item }">{{ item.alasan || '-' }}</template>
        <template #actions="{ item }">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md bg-primary text-on-primary text-label-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            :disabled="printingId === item.id"
            @click="handleCetakPdf(item.id)"
          >
            {{ printingId === item.id ? 'Membuka...' : 'Cetak PDF' }}
          </button>
          <button
            v-if="canUpdate"
            type="button"
            class="text-primary hover:underline text-label-sm"
            @click="openEdit(item)"
          >
            Edit
          </button>
          <button type="button" class="text-primary hover:underline text-label-sm" @click="openView(item.id)">
            View
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="text-on-surface-variant hover:text-error transition-colors"
            title="Hapus"
            @click="requestDelete(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Surat Keterangan' : 'Tambah Surat Keterangan'"
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
          placeholder="Pilih mahasiswa..."
          :options="mahasiswaOptions"
          :disabled="!!editingItem"
          :error="errors.mahasiswaId"
        />
        <SelectInput
          v-model="form.jenisSurat"
          label="Nama Surat"
          required
          placeholder="Pilih jenis surat..."
          :options="JENIS_SURAT_OPTIONS"
          :error="errors.jenisSurat"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalInput" label="Tanggal Input" required :error="errors.tanggalInput" />
          <TextInput v-model.number="form.semester" label="Semester" type="number" />
        </div>
        <TextInput v-model="form.nomorSurat" label="Nomor Surat" placeholder="Kosongkan untuk diisi otomatis saat dicetak" />
        <TextareaInput v-model="form.alasan" label="Alasan" :rows="2" placeholder="mis. Syarat pembuatan izin belajar PNS" />

        <template v-if="INSTANSI_JENIS.includes(form.jenisSurat as JenisSurat)">
          <TextInput v-model="form.namaInstansi" label="Nama Instansi / Perusahaan Tujuan" placeholder="mis. Klinik Zam-Zam Medika 1" />
          <TextareaInput v-model="form.alamatInstansi" label="Alamat Instansi" :rows="2" />
        </template>

        <template v-if="form.jenisSurat === KAMPUS_MERDEKA_JENIS">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model.number="form.ipk" label="IPK" type="number" step="0.01" />
            <TextInput v-model.number="form.jumlahSks" label="Jumlah SKS Ditempuh & Lulus" type="number" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.namaKoordinator" label="Nama Koordinator PT MSIB" />
            <TextInput v-model="form.noHpKoordinator" label="Nomor Hp Koordinator PT" />
          </div>
        </template>

        <template v-if="form.jenisSurat === UJIAN_UAS_JENIS">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateInput v-model="form.tanggalUjianMulai" label="Tanggal Ujian Mulai" />
            <DateInput v-model="form.tanggalUjianSelesai" label="Tanggal Ujian Selesai" />
          </div>
        </template>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal :model-value="isViewOpen" title="Pengecekan Data Surat" size="lg" @update:model-value="closeView">
      <div v-if="viewLoading" class="text-center py-12 text-on-surface-variant">Memuat data...</div>
      <div v-else-if="viewError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ viewError }}
      </div>
      <div v-else-if="viewData" class="space-y-1 text-body-sm">
        <p class="font-medium text-label-md text-on-surface mb-2">{{ jenisSuratLabel(viewData.surat.jenisSurat) }}</p>
        <div class="grid grid-cols-[160px_1fr] gap-y-1.5">
          <span class="text-on-surface-variant">Nomor Surat</span>
          <span class="text-on-surface">: {{ viewData.surat.nomorSurat || '(otomatis saat dicetak)' }}</span>
          <span class="text-on-surface-variant">Nama</span>
          <span class="text-on-surface">: {{ viewData.mahasiswa.namaLengkap }}</span>
          <span class="text-on-surface-variant">NIM</span>
          <span class="text-on-surface">: {{ viewData.mahasiswa.nim }}</span>
          <span class="text-on-surface-variant">NIK</span>
          <span class="text-on-surface">: {{ viewData.mahasiswa.noKtp || '-' }}</span>
          <span class="text-on-surface-variant">Program Studi</span>
          <span class="text-on-surface">: {{ viewData.jurusan?.namaJurusan ?? '-' }}</span>
          <span class="text-on-surface-variant">Fakultas</span>
          <span class="text-on-surface">: {{ viewData.jurusan?.namaFakultas ?? '-' }}</span>
          <span class="text-on-surface-variant">Semester</span>
          <span class="text-on-surface">: {{ viewData.surat.semester ?? '-' }}</span>
          <span class="text-on-surface-variant">Tempat/Tanggal Lahir</span>
          <span class="text-on-surface">
            : {{ viewData.mahasiswa.tempatLahir ?? '-' }}, {{ viewData.mahasiswa.tanggalLahir ? formatDate(viewData.mahasiswa.tanggalLahir) : '-' }}
          </span>
          <span class="text-on-surface-variant">Alamat</span>
          <span class="text-on-surface">: {{ viewData.mahasiswa.alamat ?? '-' }}</span>
          <span class="text-on-surface-variant">Alasan</span>
          <span class="text-on-surface">: {{ viewData.surat.alasan ?? '-' }}</span>
          <template v-if="INSTANSI_JENIS.includes(viewData.surat.jenisSurat)">
            <span class="text-on-surface-variant">Instansi Tujuan</span>
            <span class="text-on-surface">: {{ viewData.surat.namaInstansi ?? '-' }}</span>
          </template>
          <template v-if="viewData.surat.jenisSurat === KAMPUS_MERDEKA_JENIS">
            <span class="text-on-surface-variant">IPK</span>
            <span class="text-on-surface">: {{ viewData.surat.ipk ?? '-' }}</span>
            <span class="text-on-surface-variant">Jumlah SKS</span>
            <span class="text-on-surface">: {{ viewData.surat.jumlahSks ?? '-' }}</span>
            <span class="text-on-surface-variant">Koordinator PT MSIB</span>
            <span class="text-on-surface">: {{ viewData.surat.namaKoordinator ?? '-' }} ({{ viewData.surat.noHpKoordinator ?? '-' }})</span>
          </template>
          <template v-if="viewData.surat.jenisSurat === UJIAN_UAS_JENIS">
            <span class="text-on-surface-variant">Tanggal Ujian</span>
            <span class="text-on-surface">
              : {{ viewData.surat.tanggalUjianMulai ? formatDate(viewData.surat.tanggalUjianMulai) : '-' }} s/d
              {{ viewData.surat.tanggalUjianSelesai ? formatDate(viewData.surat.tanggalUjianSelesai) : '-' }}
            </span>
          </template>
        </div>
        <p v-if="!viewData.mahasiswa.noKtp || !viewData.mahasiswa.alamat" class="mt-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-label-sm">
          Data biodata mahasiswa (NIK/Alamat) belum lengkap. Lengkapi lewat menu Mahasiswa &gt; Biodata sebelum mencetak agar surat tidak berisi data kosong.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeView">Tutup</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Surat Keterangan"
      :message="`Yakin ingin menghapus surat keterangan untuk ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
