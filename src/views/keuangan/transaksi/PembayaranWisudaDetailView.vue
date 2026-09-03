<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { pembayaranWisudaApi, type PembayaranWisudaPayload } from '@/api/pembayaranWisuda';
import { mahasiswaApi } from '@/api/mahasiswa';
import { tarifLainApi } from '@/api/tarifLain';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { usePermission } from '@/composables/usePermission';
import { toastSuccess, toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { Mahasiswa, PembayaranWisuda } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const props = defineProps<{ mahasiswaId: string }>();

const { canCreate, canDelete } = usePermission(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT);

const mahasiswa = ref<Mahasiswa | null>(null);
const items = ref<PembayaranWisuda[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const tarifWisudaOptions = ref<{ value: string; label: string; biaya: number }[]>([]);

const loadMahasiswa = async () => {
  mahasiswa.value = await mahasiswaApi.get(props.mahasiswaId);
};

const loadTarifWisuda = async () => {
  const result = await tarifLainApi.list({ limit: 200, search: 'WISUDA' });
  tarifWisudaOptions.value = result.data
    .filter((t) => t.kodeBiaya === 'WISUDA')
    .sort((a, b) => b.tahunMasuk - a.tahunMasuk)
    .map((t) => ({
      value: `${t.tahunMasuk}/${t.tahunMasuk + 1}`,
      label: `${t.tahunMasuk}/${t.tahunMasuk + 1} - ${formatCurrencyIdr(t.biaya)}`,
      biaya: t.biaya,
    }));
};

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'noBukti', label: 'No Bukti' },
  { key: 'tanggalBayar', label: 'Tanggal Bayar' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'bayar', label: 'Nominal', align: 'right' },
  { key: 'kodeBank', label: 'Kode Bank' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await pembayaranWisudaApi.list({ mahasiswaId: props.mahasiswaId, page: page.value, limit: 10 });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data pembayaran wisuda');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadMahasiswa(), loadTarifWisuda(), fetchItems()]);
});

watch(page, fetchItems);

const isFormOpen = ref(false);
interface FormState {
  tanggalBayar: string;
  noBukti: string;
  periode: string;
  bayar: number | null;
  kodeBank: string;
}
const todayIso = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): FormState => ({ tanggalBayar: todayIso(), noBukti: '', periode: '', bayar: null, kodeBank: '' });
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

const onPeriodeChange = () => {
  const selected = tarifWisudaOptions.value.find((t) => t.value === form.periode);
  if (selected) form.bayar = selected.biaya;
};

const onBayarInput = (event: Event) => {
  form.bayar = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.tanggalBayar) errors.tanggalBayar = 'Tanggal bayar wajib diisi';
  if (!form.noBukti.trim()) errors.noBukti = 'No bukti wajib diisi';
  if (!form.periode) errors.periode = 'Jenis pembayaran wajib dipilih';
  if (!form.bayar || form.bayar <= 0) errors.bayar = 'Jumlah bayar wajib diisi';
  if (Object.keys(errors).length > 0) return;
  if (!mahasiswa.value) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PembayaranWisudaPayload = {
      nim: mahasiswa.value.nim,
      tanggalBayar: form.tanggalBayar,
      noBukti: form.noBukti.trim(),
      periode: form.periode,
      bayar: Number(form.bayar),
      kodeBank: form.kodeBank.trim() || null,
    };
    await pembayaranWisudaApi.create(payload);
    closeForm();
    toastSuccess('Pembayaran wisuda berhasil disimpan');
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data pembayaran wisuda');
  } finally {
    submitting.value = false;
  }
};

const deleteTarget = ref<PembayaranWisuda | null>(null);
const deleting = ref(false);
const requestDelete = (item: PembayaranWisuda) => {
  deleteTarget.value = item;
};
const cancelDelete = () => {
  deleteTarget.value = null;
};
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await pembayaranWisudaApi.remove(deleteTarget.value.id);
    deleteTarget.value = null;
    toastSuccess('Data pembayaran wisuda dihapus');
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus data pembayaran wisuda'));
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Detail Pembayaran Wisuda"
      :back-to="{ name: 'keuangan-pembayaran-wisuda' }"
      back-label="Kembali ke Pembayaran Wisuda"
    >
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Detail Pembayaran Wisuda
      </div>

      <div v-if="mahasiswa" class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
        <span class="text-on-surface-variant">NIM</span>
        <span class="text-on-surface">: {{ mahasiswa.nim }}</span>
        <span class="text-on-surface-variant">Nama</span>
        <span class="text-on-surface">: {{ mahasiswa.namaLengkap }}</span>
        <span class="text-on-surface-variant">Kelas</span>
        <span class="text-on-surface">: {{ mahasiswa.jurusan?.namaJurusan ?? '-' }}</span>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data pembayaran wisuda">
        <template #cell-tanggalBayar="{ item }">{{ formatDate(item.tanggalBayar) }}</template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
        <template #cell-bayar="{ item }">{{ formatCurrencyIdr(item.bayar) }}</template>
        <template #cell-kodeBank="{ item }">{{ item.kodeBank || '-' }}</template>
        <template #actions="{ item }">
          <button
            v-if="canDelete"
            type="button"
            class="text-on-surface-variant hover:text-error transition-colors"
            title="Hapus"
            @click="requestDelete(item as PembayaranWisuda)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" title="Form Input Data Detail Pembayaran Wisuda" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalBayar" label="Tanggal Bayar" required :error="errors.tanggalBayar" />
          <TextInput v-model="form.noBukti" label="No Bukti" required :error="errors.noBukti" />
        </div>
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Mahasiswa</span>
          <div class="px-3 py-2 rounded-md bg-surface-container-low text-body-md text-on-surface">
            {{ mahasiswa?.nim }} - {{ mahasiswa?.namaLengkap }}
          </div>
        </div>
        <SelectInput
          v-model="form.periode"
          label="Jenis Pembayaran"
          required
          placeholder="-- Pilih Periode Wisuda --"
          :options="tarifWisudaOptions"
          :error="errors.periode"
          @update:model-value="onPeriodeChange"
        />
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
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembayaran Wisuda"
      :message="`Yakin ingin menghapus pembayaran wisuda no bukti ${deleteTarget?.noBukti ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
