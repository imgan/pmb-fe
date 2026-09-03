<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { pembayaranTaSkripsiApi, type PembayaranTaSkripsiPayload } from '@/api/pembayaranTaSkripsi';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastSuccess, toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { PembayaranTaSkripsi } from '@/types/entities';

const { canCreate, canDelete } = usePermission(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT);

const mahasiswaOptions = ref<{ value: string; label: string }[]>([]);
const mahasiswaIdByNim = ref<Record<string, number>>({});
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 500 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.nim, label: `${m.nim} - ${m.namaLengkap}` }));
  mahasiswaIdByNim.value = Object.fromEntries(result.data.map((m) => [m.nim, m.id]));
});

const {
  items,
  meta,
  page,
  search,
  loading,
  error,
  isFormOpen,
  fetchItems,
  openCreate,
  closeForm,
  onSaved,
  deleteTarget,
  deleting,
  requestDelete,
  cancelDelete,
  confirmDelete,
} = useCrudPage<PembayaranTaSkripsi>({
  fetchList: pembayaranTaSkripsiApi.list,
  remove: pembayaranTaSkripsiApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'periode', label: 'Periode', align: 'center' },
  { key: 'tanggalBayar', label: 'Tanggal Bayar' },
  { key: 'noBukti', label: 'No Bukti' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  nim: string;
  periode: number | '';
  tanggalBayar: string;
  noBukti: string;
  nominal: number | null;
  kodeBank: string;
  keterangan: string;
}
const todayIso = () => new Date().toISOString().slice(0, 10);
const currentYear = () => new Date().getFullYear();
const emptyForm = (): FormState => ({
  nim: '',
  periode: currentYear(),
  tanggalBayar: todayIso(),
  noBukti: '',
  nominal: null,
  kodeBank: '',
  keterangan: '',
});
const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(isFormOpen, (open) => {
  if (!open) return;
  Object.assign(form, emptyForm());
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
});

// Auto-isi nominal dari Master Tarif TA/Skripsi (biaya pendaftaran per prodi) begitu NIM & periode terisi.
watch([() => form.nim, () => form.periode], async ([nim, periode]) => {
  if (!nim || !periode) return;
  try {
    const tarif = await pembayaranTaSkripsiApi.tarif(nim, Number(periode));
    if (tarif.biayaPendaftaran != null) form.nominal = tarif.biayaPendaftaran;
  } catch {
    // Diam saja — mahasiswa/tarif belum lengkap, admin isi nominal manual.
  }
});

const onNominalInput = (event: Event) => {
  form.nominal = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'Mahasiswa wajib dipilih';
  if (!form.periode) errors.periode = 'Periode wajib diisi';
  if (!form.tanggalBayar) errors.tanggalBayar = 'Tanggal bayar wajib diisi';
  if (!form.noBukti.trim()) errors.noBukti = 'No bukti wajib diisi';
  if (!form.nominal || form.nominal <= 0) errors.nominal = 'Nominal wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const mahasiswaId = mahasiswaIdByNim.value[form.nim];
    if (!mahasiswaId) throw new Error(`Mahasiswa dengan NIM ${form.nim} tidak ditemukan`);

    const payload: PembayaranTaSkripsiPayload = {
      mahasiswaId,
      periode: Number(form.periode),
      tanggalBayar: form.tanggalBayar,
      noBukti: form.noBukti.trim(),
      nominal: Number(form.nominal),
      kodeBank: form.kodeBank.trim() || null,
      keterangan: form.keterangan.trim() || null,
    };
    await pembayaranTaSkripsiApi.create(payload);
    onSaved();
    toastSuccess('Pembayaran TA/Skripsi berhasil disimpan');
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pembayaran TA/Skripsi');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async () => {
  try {
    await confirmDelete();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus data'));
  }
};
</script>

<template>
  <div>
    <PageHeader title="Pembayaran TA/Skripsi" subtitle="Transaksi pembayaran biaya tugas akhir/skripsi.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Pembayaran TA/Skripsi</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data pembayaran TA/Skripsi">
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-tanggalBayar="{ item }">{{ formatDate(item.tanggalBayar) }}</template>
        <template #cell-nominal="{ item }">{{ formatCurrencyIdr(item.nominal) }}</template>
        <template #actions="{ item }">
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

    <Modal :model-value="isFormOpen" title="Form Pembayaran TA/Skripsi" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SearchableSelect
          v-model="form.nim"
          label="Mahasiswa"
          required
          placeholder="Pilih mahasiswa..."
          search-placeholder="Cari NIM atau nama..."
          :options="mahasiswaOptions"
          :error="errors.nim"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.periode" label="Periode" type="number" required :error="errors.periode" />
          <DateInput v-model="form.tanggalBayar" label="Tanggal Bayar" required :error="errors.tanggalBayar" />
        </div>
        <TextInput v-model="form.noBukti" label="No Bukti" required :error="errors.noBukti" />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">
            Nominal<span class="text-error"> *</span>
          </span>
          <input
            :value="formatCurrencyInputIdr(form.nominal)"
            inputmode="numeric"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="
              errors.nominal
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
            "
            @input="onNominalInput"
          />
          <p v-if="errors.nominal" class="mt-1 text-label-sm text-error">{{ errors.nominal }}</p>
          <p v-else class="mt-1 text-label-sm text-on-surface-variant">Terisi otomatis dari Master Tarif TA/Skripsi (biaya pendaftaran sesuai prodi) jika tersedia.</p>
        </label>
        <TextInput v-model="form.kodeBank" label="Kode Bank" placeholder="mis. BCA, BRI" />
        <TextInput v-model="form.keterangan" label="Keterangan" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembayaran TA/Skripsi"
      :message="`Yakin ingin menghapus data pembayaran ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
