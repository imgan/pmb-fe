<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import { mahasiswaSuratKeteranganApi, type CreateSuratRequestPayload } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastSuccess, toastError } from '@/utils/swal';
import type { JenisSurat, StatusSuratKeterangan, SuratKeterangan } from '@/types/entities';

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

const STATUS_LABELS: Record<StatusSuratKeterangan, string> = {
  DIAJUKAN: 'Menunggu Diproses',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};
const STATUS_VARIANT: Record<StatusSuratKeterangan, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};

const items = ref<SuratKeterangan[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    items.value = await mahasiswaSuratKeteranganApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pengajuan surat');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchItems);

// ---- Form pengajuan ----
const isFormOpen = ref(false);
interface FormState {
  jenisSurat: JenisSurat | '';
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
const emptyForm = (): FormState => ({
  jenisSurat: '',
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

const openCreate = () => {
  Object.assign(form, emptyForm());
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
  isFormOpen.value = true;
};
const closeForm = () => {
  isFormOpen.value = false;
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.jenisSurat) errors.jenisSurat = 'Jenis surat wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: CreateSuratRequestPayload = {
      jenisSurat: form.jenisSurat as JenisSurat,
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
    await mahasiswaSuratKeteranganApi.create(payload);
    closeForm();
    toastSuccess('Pengajuan surat berhasil dikirim, menunggu diproses BAAK');
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal mengirim pengajuan surat');
  } finally {
    submitting.value = false;
  }
};

// ---- Cetak PDF ----
const printingId = ref<number | null>(null);
const handleCetakPdf = async (item: SuratKeterangan) => {
  printingId.value = item.id;
  try {
    const blob = await mahasiswaSuratKeteranganApi.cetakPdf(item.id);
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen'));
  } finally {
    if (printingId.value === item.id) printingId.value = null;
  }
};
</script>

<template>
  <div>
    <header class="mb-8 flex justify-between items-end flex-wrap gap-4">
      <div>
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Cetak Surat</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Ajukan surat keterangan dan pantau statusnya.</p>
      </div>
      <AppButton icon="add" @click="openCreate">Ajukan Surat</AppButton>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Riwayat Pengajuan Surat</div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

      <div v-else class="divide-y divide-outline-variant">
        <div v-for="item in items" :key="item.id" class="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="text-body-md text-on-surface font-medium">{{ jenisSuratLabel(item.jenisSurat) }}</p>
            <p class="text-body-sm text-on-surface-variant">
              Diajukan {{ formatDate(item.tanggalInput) }}
              <span v-if="item.nomorSurat">&middot; No. {{ item.nomorSurat }}</span>
            </p>
          </div>
          <div class="flex items-center gap-3">
            <StatusBadge :label="STATUS_LABELS[item.status]" :variant="STATUS_VARIANT[item.status]" />
            <AppButton
              v-if="item.status === 'DISETUJUI'"
              :disabled="printingId === item.id"
              @click="handleCetakPdf(item)"
            >
              {{ printingId === item.id ? 'Membuka...' : 'Cetak PDF' }}
            </AppButton>
          </div>
        </div>

        <p v-if="!items.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada pengajuan surat. Klik "Ajukan Surat" untuk membuat pengajuan baru.
        </p>
      </div>
    </section>

    <Modal :model-value="isFormOpen" title="Ajukan Surat Keterangan" size="lg" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.jenisSurat"
          label="Jenis Surat"
          required
          placeholder="Pilih jenis surat..."
          :options="JENIS_SURAT_OPTIONS"
          :error="errors.jenisSurat"
        />
        <TextInput v-model.number="form.semester" label="Semester" type="number" />
        <TextareaInput v-model="form.alasan" label="Alasan / Keperluan" :rows="2" placeholder="mis. Syarat pembuatan izin belajar PNS" />

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
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Mengirim...' : 'Ajukan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
