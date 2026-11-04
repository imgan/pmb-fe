<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import CicilanTagihanModal from '@/components/keuangan/CicilanTagihanModal.vue';
import { pembayaranTaSkripsiApi, type OpsiTagihanTa, type PembayaranTaSkripsiPayload } from '@/api/pembayaranTaSkripsi';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { usePermission } from '@/composables/usePermission';
import { toastSuccess, toastError } from '@/utils/swal';
import { openBlob } from '@/utils/download';
import { MENU } from '@/constants/menuCodes';
import type { Mahasiswa, PembayaranTaSkripsi } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const props = defineProps<{ mahasiswaId: string }>();

const { canCreate, canUpdate, canDelete } = usePermission(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT);

const mahasiswa = ref<Mahasiswa | null>(null);
const items = ref<PembayaranTaSkripsi[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const loading = ref(true);
const error = ref<string | null>(null);

const opsiTagihan = ref<OpsiTagihanTa[]>([]);
// Modal jadwal cicilan (komponen bersama tagihan kuliah).
const cicilanOpen = ref(false);
const cicilanTagihanId = ref<number | null>(null);
const bukaCicilan = (id: number) => {
  cicilanTagihanId.value = id;
  cicilanOpen.value = true;
};
// Jenis pembayaran melekat pada tagihan hasil Generate Tagihan, tidak bisa dipilih.
const tagihan = computed(() => opsiTagihan.value[0] ?? null);
const jenisPembayaran = computed(() =>
  tagihan.value ? `${tagihan.value.keterangan ?? `TA/Skripsi ${tagihan.value.periode}`} - sisa ${formatCurrencyIdr(tagihan.value.sisa)}` : ''
);

const loadMahasiswa = async () => {
  mahasiswa.value = await mahasiswaApi.get(props.mahasiswaId);
};

const loadTagihan = async () => {
  opsiTagihan.value = await pembayaranTaSkripsiApi.opsiTagihan(props.mahasiswaId);
};

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'noBukti', label: 'No Bukti' },
  { key: 'tanggalBayar', label: 'Tanggal Bayar' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
  { key: 'kodeBank', label: 'Kode Bank' },
  { key: 'keterangan', label: 'Keterangan' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await pembayaranTaSkripsiApi.list({ mahasiswaId: props.mahasiswaId, page: page.value, limit: pageSize.value });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data pembayaran TA/Skripsi');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadMahasiswa(), loadTagihan(), fetchItems()]);
});

watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});

const isFormOpen = ref(false);
interface FormState {
  tanggalBayar: string;
  noBukti: string;
  bayar: number | null;
  kodeBank: string;
  keterangan: string;
}
const todayIso = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): FormState => ({ tanggalBayar: todayIso(), noBukti: '', bayar: null, kodeBank: '', keterangan: '' });
const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

const openCreate = () => {
  Object.assign(form, emptyForm());
  // Bawaan bayar = sisa cicilan berikutnya, atau sisa tagihan; boleh diubah untuk mencicil.
  form.bayar = tagihan.value?.cicilanBerikutnya?.sisa ?? tagihan.value?.sisa ?? null;
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
  isFormOpen.value = true;
};
const closeForm = () => {
  isFormOpen.value = false;
};

const onBayarInput = (event: Event) => {
  form.bayar = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.tanggalBayar) errors.tanggalBayar = 'Tanggal bayar wajib diisi';
  if (!form.noBukti.trim()) errors.noBukti = 'No bukti wajib diisi';
  if (!form.bayar || form.bayar <= 0) errors.bayar = 'Jumlah bayar wajib diisi';
  else if (tagihan.value && form.bayar > tagihan.value.sisa) errors.bayar = `Melebihi sisa tagihan (${formatCurrencyIdr(tagihan.value.sisa)})`;
  if (Object.keys(errors).length > 0) return;
  if (!mahasiswa.value) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PembayaranTaSkripsiPayload = {
      mahasiswaId: mahasiswa.value.id,
      tanggalBayar: form.tanggalBayar,
      noBukti: form.noBukti.trim(),
      nominal: Number(form.bayar),
      kodeBank: form.kodeBank.trim() || null,
      keterangan: form.keterangan.trim() || null,
    };
    await pembayaranTaSkripsiApi.create(payload);
    closeForm();
    toastSuccess('Pembayaran TA/Skripsi berhasil disimpan');
    fetchItems();
    loadTagihan();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data pembayaran TA/Skripsi');
  } finally {
    submitting.value = false;
  }
};

const cetakKwitansi = async (item: PembayaranTaSkripsi) => {
  try {
    openBlob(await pembayaranTaSkripsiApi.kwitansiPdf(item.id));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka kwitansi'));
  }
};

const deleteTarget = ref<PembayaranTaSkripsi | null>(null);
const deleting = ref(false);
const requestDelete = (item: PembayaranTaSkripsi) => {
  deleteTarget.value = item;
};
const cancelDelete = () => {
  deleteTarget.value = null;
};
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await pembayaranTaSkripsiApi.remove(deleteTarget.value.id);
    deleteTarget.value = null;
    toastSuccess('Data pembayaran TA/Skripsi dihapus');
    fetchItems();
    loadTagihan();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus data pembayaran TA/Skripsi'));
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Detail Pembayaran TA/Skripsi"
      :back-to="{ name: 'keuangan-pembayaran-ta-skripsi' }"
      back-label="Kembali ke Pembayaran TA/Skripsi"
    >
      <template v-if="canCreate" #actions>
        <AppButton icon="add" :disabled="!tagihan || tagihan.sisa <= 0" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Detail Pembayaran TA/Skripsi
      </div>

      <div v-if="mahasiswa" class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
        <span class="text-on-surface-variant">NIM</span>
        <span class="text-on-surface">: {{ mahasiswa.nim }}</span>
        <span class="text-on-surface-variant">Nama</span>
        <span class="text-on-surface">: {{ mahasiswa.namaLengkap }}</span>
        <span class="text-on-surface-variant">Kelas</span>
        <span class="text-on-surface">: {{ mahasiswa.jurusan?.namaJurusan ?? '-' }}</span>
        <template v-for="t in opsiTagihan" :key="t.tagihanTaSkripsiId">
          <span class="text-on-surface-variant">Tagihan {{ t.keterangan ?? `TA/Skripsi ${t.periode}` }}</span>
          <span class="text-on-surface">: {{ formatCurrencyIdr(t.total) }} · dibayar {{ formatCurrencyIdr(t.dibayar) }} · <strong v-if="t.lebihBayar" class="text-success">lebih bayar {{ formatCurrencyIdr(t.lebihBayar) }}</strong><strong v-else>sisa {{ formatCurrencyIdr(t.sisa) }}</strong>
            <span v-if="t.jumlahCicilan"> · cicilan {{ t.cicilanLunas }}/{{ t.jumlahCicilan }} lunas</span>
            <span v-if="t.cicilanBerikutnya" :class="t.cicilanBerikutnya.terlambat ? 'text-error font-medium' : ''"> · berikutnya ke-{{ t.cicilanBerikutnya.cicilanKe }}: {{ formatCurrencyIdr(t.cicilanBerikutnya.sisa) }}{{ t.cicilanBerikutnya.tanggalJatuhTempo ? ` (jatuh tempo ${formatDate(t.cicilanBerikutnya.tanggalJatuhTempo)})` : '' }}</span>
            <button type="button" class="ml-2 inline-flex items-center gap-1 text-primary hover:underline" @click="bukaCicilan(t.tagihanTaSkripsiId)">
              <span class="material-symbols-outlined" style="font-size: 16px">calendar_month</span>Jadwal Cicilan
            </button>
          </span>
        </template>
        <p v-if="!opsiTagihan.length" class="md:col-span-2 mt-1 text-error">Belum ada tagihan TA/Skripsi. Pembayaran bisa dicatat setelah tagihan dibuat lewat Generate Tagihan.</p>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data pembayaran TA/Skripsi">
        <template #cell-tanggalBayar="{ item }">{{ formatDate(item.tanggalBayar) }}</template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
        <template #cell-nominal="{ item }">{{ formatCurrencyIdr(item.nominal) }}</template>
        <template #cell-kodeBank="{ item }">{{ item.kodeBank || '-' }}</template>
        <template #cell-keterangan="{ item }">{{ item.keterangan || '-' }}</template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors mr-3"
            title="Cetak Kwitansi"
            @click="cetakKwitansi(item as PembayaranTaSkripsi)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">print</span>
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="text-on-surface-variant hover:text-error transition-colors"
            title="Hapus"
            @click="requestDelete(item as PembayaranTaSkripsi)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <CicilanTagihanModal v-model="cicilanOpen" :tagihan-id="cicilanTagihanId" :can-edit="canUpdate" :api="pembayaranTaSkripsiApi" @saved="loadTagihan" />

    <Modal :model-value="isFormOpen" title="Form Input Data Detail Pembayaran TA/Skripsi" size="md" @update:model-value="closeForm">
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
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Jenis Pembayaran</span>
          <div class="px-3 py-2 rounded-md bg-surface-container-low text-body-md text-on-surface">{{ jenisPembayaran }}</div>
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
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembayaran TA/Skripsi"
      :message="`Yakin ingin menghapus pembayaran TA/Skripsi no bukti ${deleteTarget?.noBukti ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
