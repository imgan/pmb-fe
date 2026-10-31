<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { pembayaranSpApi, type PembayaranSpPayload } from '@/api/pembayaranSp';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastSuccess, toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { PembayaranSp } from '@/types/entities';

const { canCreate, canDelete } = usePermission(MENU.KEUANGAN_PEMBAYARAN_SP_MANAGEMENT);

const mahasiswaOptions = ref<{ value: string; label: string }[]>([]);
const mahasiswaIdByNim = ref<Record<string, number>>({});
onMounted(async () => {
  const result = await mahasiswaApi.list({ limit: 1000 });
  mahasiswaOptions.value = result.data.map((m) => ({ value: m.nim, label: `${m.nim} - ${m.namaLengkap}` }));
  mahasiswaIdByNim.value = Object.fromEntries(result.data.map((m) => [m.nim, m.id]));
});

const {
  items,
  meta,
  page,
  limit,
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
} = useCrudPage<PembayaranSp>({
  fetchList: pembayaranSpApi.list,
  remove: pembayaranSpApi.remove,
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'tanggalBayar', label: 'Tanggal Bayar' },
  { key: 'noBukti', label: 'No Bukti' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

interface FormState {
  nim: string;
  tanggalBayar: string;
  noBukti: string;
  nominal: number | null;
  kodeBank: string;
  keterangan: string;
}
const todayIso = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): FormState => ({
  nim: '',
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

// Auto-isi nominal dari Master Tarif Biaya Lain (kode biaya "SP") begitu NIM terisi.
watch(
  () => form.nim,
  async (nim) => {
    if (!nim) return;
    try {
      const tarif = await pembayaranSpApi.tarif(nim);
      if (tarif.biayaSp != null) form.nominal = tarif.biayaSp;
    } catch {
      // Diam saja — mahasiswa/tarif belum lengkap, admin isi nominal manual.
    }
  }
);

const onNominalInput = (event: Event) => {
  form.nominal = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'Mahasiswa wajib dipilih';
  if (!form.tanggalBayar) errors.tanggalBayar = 'Tanggal bayar wajib diisi';
  if (!form.noBukti.trim()) errors.noBukti = 'No bukti wajib diisi';
  if (!form.nominal || form.nominal <= 0) errors.nominal = 'Nominal wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const mahasiswaId = mahasiswaIdByNim.value[form.nim];
    if (!mahasiswaId) throw new Error(`Mahasiswa dengan NIM ${form.nim} tidak ditemukan`);

    const payload: PembayaranSpPayload = {
      mahasiswaId,
      tanggalBayar: form.tanggalBayar,
      noBukti: form.noBukti.trim(),
      nominal: Number(form.nominal),
      kodeBank: form.kodeBank.trim() || null,
      keterangan: form.keterangan.trim() || null,
    };
    await pembayaranSpApi.create(payload);
    onSaved();
    toastSuccess('Pembayaran SP berhasil disimpan');
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pembayaran SP');
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
    <PageHeader title="Pembayaran SP" subtitle="Transaksi pembayaran Surat Peringatan (SP) mahasiswa.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Pembayaran SP</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data pembayaran SP">
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

    <Modal :model-value="isFormOpen" title="Form Pembayaran SP" size="md" @update:model-value="closeForm">
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
        <DateInput v-model="form.tanggalBayar" label="Tanggal Bayar" required :error="errors.tanggalBayar" />
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
          <p v-else class="mt-1 text-label-sm text-on-surface-variant">Terisi otomatis dari Master Tarif Biaya Lain (kode biaya "SP") jika tersedia.</p>
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
      title="Hapus Pembayaran SP"
      :message="`Yakin ingin menghapus data pembayaran ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
