<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import FileInput from '@/components/ui/FileInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { pembayaranSertifikasiApi, type PembayaranSertifikasiPayload } from '@/api/pembayaranSertifikasi';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { PembayaranSertifikasi, StatusSertifikasi } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT);

const JENIS_PEMBAYARAN_OPTIONS = [
  { value: 'Sertifikasi Kompetensi', label: 'Sertifikasi Kompetensi' },
  { value: 'Sertifikasi Bahasa Inggris (TOEFL)', label: 'Sertifikasi Bahasa Inggris (TOEFL)' },
  { value: 'Sertifikasi Komputer', label: 'Sertifikasi Komputer' },
];
const CARA_PEMBAYARAN_OPTIONS = [
  { value: 'Tunai', label: 'Tunai' },
  { value: 'Transfer Bank', label: 'Transfer Bank' },
  { value: 'EDC/Kartu', label: 'EDC/Kartu' },
];
const WAKTU_PELAKSANAAN_OPTIONS = [
  { value: 'Pagi', label: 'Pagi' },
  { value: 'Siang', label: 'Siang' },
  { value: 'Sore', label: 'Sore' },
];
const STATUS_LABELS: Record<StatusSertifikasi, string> = {
  MENUNGGU: 'Menunggu',
  LULUS: 'Lulus',
  TIDAK_LULUS: 'Tidak Lulus',
};
const STATUS_VARIANT: Record<StatusSertifikasi, 'success' | 'warning' | 'danger' | 'neutral'> = {
  MENUNGGU: 'warning',
  LULUS: 'success',
  TIDAK_LULUS: 'danger',
};
const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

const mahasiswaOptions = ref<{ value: string; label: string }[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 500 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.nim, label: `${m.nim} - ${m.namaLengkap}` }));
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
} = useCrudPage<PembayaranSertifikasi>({
  fetchList: pembayaranSertifikasiApi.list,
  remove: pembayaranSertifikasiApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nama', label: 'Nama' },
  { key: 'tanggalBayar', label: 'Tanggal Pembayaran', sortable: true },
  { key: 'noBukti', label: 'No. ref', sortable: true },
  { key: 'keterangan', label: 'Keterangan' },
  { key: 'statusSertifikasi', label: 'Status Sertifikasi', align: 'center' },
  { key: 'bayar', label: 'Tarif', align: 'right', sortable: true },
  { key: 'buktiPembayaran', label: 'Bukti Pembayaran', align: 'center' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  nim: string;
  tanggalBayar: string;
  noBukti: string;
  jenisPembayaran: string;
  caraPembayaran: string;
  tanggalPelaksanaan: string;
  waktuPelaksanaan: string;
  bayar: number | null;
  kodeBank: string;
  keterangan: string;
  statusSertifikasi: StatusSertifikasi;
  buktiPembayaran: string | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  nim: '',
  tanggalBayar: todayIso(),
  noBukti: '',
  jenisPembayaran: '',
  caraPembayaran: '',
  tanggalPelaksanaan: '',
  waktuPelaksanaan: '',
  bayar: null,
  kodeBank: '',
  keterangan: '',
  statusSertifikasi: 'MENUNGGU',
  buktiPembayaran: null,
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
      form.nim = editing.mahasiswa?.nim ?? '';
      form.tanggalBayar = editing.tanggalBayar.slice(0, 10);
      form.noBukti = editing.noBukti;
      form.jenisPembayaran = editing.jenisPembayaran;
      form.caraPembayaran = editing.caraPembayaran;
      form.tanggalPelaksanaan = editing.tanggalPelaksanaan?.slice(0, 10) ?? '';
      form.waktuPelaksanaan = editing.waktuPelaksanaan ?? '';
      form.bayar = editing.bayar;
      form.kodeBank = editing.kodeBank ?? '';
      form.keterangan = editing.keterangan ?? '';
      form.statusSertifikasi = editing.statusSertifikasi;
      form.buktiPembayaran = editing.buktiPembayaran;
    }
  },
  { immediate: true }
);

const onBayarInput = (event: Event) => {
  form.bayar = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'Mahasiswa wajib dipilih';
  if (!form.tanggalBayar) errors.tanggalBayar = 'Tanggal bayar wajib diisi';
  if (!form.noBukti.trim()) errors.noBukti = 'No bukti wajib diisi';
  if (!form.jenisPembayaran) errors.jenisPembayaran = 'Jenis pembayaran wajib dipilih';
  if (!form.caraPembayaran) errors.caraPembayaran = 'Cara pembayaran wajib dipilih';
  if (!form.bayar || form.bayar <= 0) errors.bayar = 'Jumlah bayar wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PembayaranSertifikasiPayload = {
      nim: form.nim.trim(),
      tanggalBayar: form.tanggalBayar,
      noBukti: form.noBukti.trim(),
      jenisPembayaran: form.jenisPembayaran,
      caraPembayaran: form.caraPembayaran,
      tanggalPelaksanaan: form.tanggalPelaksanaan || null,
      waktuPelaksanaan: form.waktuPelaksanaan || null,
      bayar: Number(form.bayar),
      kodeBank: form.kodeBank.trim() || null,
      keterangan: form.keterangan.trim() || null,
      statusSertifikasi: form.statusSertifikasi,
      buktiPembayaran: form.buktiPembayaran,
    };
    if (editingItem.value) {
      await pembayaranSertifikasiApi.update(editingItem.value.id, payload);
    } else {
      await pembayaranSertifikasiApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data pembayaran sertifikasi');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Pembayaran Sertifikasi" subtitle="Transaksi pembayaran sertifikasi mahasiswa.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Pembayaran Sertifikasi
      </div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data pembayaran sertifikasi"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-nama="{ item }">
          {{ item.mahasiswa?.nim ?? '-' }} {{ item.mahasiswa?.namaLengkap ?? '' }}
        </template>
        <template #cell-tanggalBayar="{ item }">{{ formatDate(item.tanggalBayar) }}</template>
        <template #cell-keterangan="{ item }">{{ item.keterangan || '-' }}</template>
        <template #cell-statusSertifikasi="{ item }">
          <StatusBadge :label="STATUS_LABELS[item.statusSertifikasi]" :variant="STATUS_VARIANT[item.statusSertifikasi]" />
        </template>
        <template #cell-bayar="{ item }">{{ formatCurrencyIdr(item.bayar) }}</template>
        <template #cell-buktiPembayaran="{ item }">
          <a
            v-if="item.buktiPembayaran"
            :href="item.buktiPembayaran"
            target="_blank"
            rel="noopener"
            class="text-primary hover:underline text-label-sm"
          >
            Lihat
          </a>
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Pembayaran Sertifikasi' : 'Form Input Data Pembayaran Sertifikasi'"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalBayar" label="Tanggal Bayar" required :error="errors.tanggalBayar" />
          <TextInput v-model="form.noBukti" label="No Bukti" required :error="errors.noBukti" />
        </div>
        <SearchableSelect
          v-model="form.nim"
          label="Mahasiswa"
          required
          placeholder="Pilih mahasiswa..."
          search-placeholder="Cari NIM atau nama..."
          :options="mahasiswaOptions"
          :disabled="!!editingItem"
          :error="errors.nim"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="form.jenisPembayaran"
            label="Jenis Pembayaran"
            required
            placeholder="-- Sertifikasi --"
            :options="JENIS_PEMBAYARAN_OPTIONS"
            :error="errors.jenisPembayaran"
          />
          <SelectInput
            v-model="form.caraPembayaran"
            label="Cara Pembayaran"
            required
            placeholder="-- Cara Bayar --"
            :options="CARA_PEMBAYARAN_OPTIONS"
            :error="errors.caraPembayaran"
          />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalPelaksanaan" label="Tanggal Pelaksanaan" />
          <SelectInput
            v-model="form.waktuPelaksanaan"
            label="Waktu Pelaksanaan"
            placeholder="-- Pelaksanaan --"
            :options="WAKTU_PELAKSANAAN_OPTIONS"
          />
        </div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Bayar<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.bayar)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.bayar
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onBayarInput"
          />
          <p v-if="errors.bayar" class="mt-1 text-label-sm text-error">{{ errors.bayar }}</p>
        </label>
        <TextInput v-model="form.kodeBank" label="Kode Bank" placeholder="mis. BCA, BRI" />
        <TextInput v-model="form.keterangan" label="Keterangan" />
        <SelectInput v-model="form.statusSertifikasi" label="Status Sertifikasi" :options="statusOptions" />
        <FileInput v-model="form.buktiPembayaran" label="Bukti Pembayaran" accept="application/pdf,image/png,image/jpeg" preview />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembayaran Sertifikasi"
      :message="`Yakin ingin menghapus data pembayaran sertifikasi ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
