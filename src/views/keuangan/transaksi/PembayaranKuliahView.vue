<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { tagihanKuliahApi } from '@/api/tagihanKuliah';
import { pembayaranKuliahApi, type PembayaranKuliahPayload } from '@/api/pembayaranKuliah';
import { pembayaranTaSkripsiApi } from '@/api/pembayaranTaSkripsi';
import { perpanjanganTaSkripsiApi } from '@/api/perpanjanganTaSkripsi';
import { pembayaranLainApi } from '@/api/pembayaranLain';
import { laporanKeuanganApi } from '@/api/laporanKeuangan';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, formatDate, parseRupiahInput } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';
import type { PembayaranKuliah, RingkasanBiayaLainRow, RingkasanTaSkripsiPeriode, TagihanKuliah } from '@/types/entities';

// ---- Cari mahasiswa & tagihannya (kuliah + TA/Skripsi) ----
const nimInput = ref('');
const searching = ref(false);
const searchError = ref<string | null>(null);
const tagihanList = ref<TagihanKuliah[]>([]);
const taSkripsiList = ref<RingkasanTaSkripsiPeriode[]>([]);
const biayaLainList = ref<RingkasanBiayaLainRow[]>([]);
const searched = ref(false);

const mahasiswaLabel = computed(() => {
  const mahasiswa = tagihanList.value[0]?.mahasiswa;
  return mahasiswa ? `${mahasiswa.nim} - ${mahasiswa.namaLengkap}` : nimInput.value.trim();
});

const handleCari = async () => {
  if (!nimInput.value.trim()) return;
  searching.value = true;
  searchError.value = null;
  try {
    const [tagihan, taSkripsi, biayaLain] = await Promise.all([
      tagihanKuliahApi.cariByNim(nimInput.value.trim()),
      laporanKeuanganApi.tunggakanTaSkripsi(nimInput.value.trim()),
      pembayaranLainApi.ringkasan(nimInput.value.trim()),
    ]);
    tagihanList.value = tagihan;
    taSkripsiList.value = taSkripsi;
    biayaLainList.value = biayaLain;
    searched.value = true;
  } catch (err) {
    searchError.value = extractErrorMessage(err, 'Gagal mencari tagihan mahasiswa');
    tagihanList.value = [];
    taSkripsiList.value = [];
    biayaLainList.value = [];
  } finally {
    searching.value = false;
  }
};

// ---- Daftar tagihan yang bisa dibayar (kuliah + TA/Skripsi pendaftaran/perpanjangan digabung
// jadi satu dropdown "pembayaran lain", supaya kasir tidak perlu pindah halaman kalau mahasiswa
// yang sama punya lebih dari satu jenis tagihan) ----
interface PayableItem {
  key: string;
  label: string;
  sisa: number;
  kind: 'KULIAH' | 'TA_PENDAFTARAN' | 'TA_PERPANJANGAN' | 'BIAYA_LAIN';
  tagihan?: TagihanKuliah;
  mahasiswaId?: number;
  periode?: number;
  tarifLainId?: number;
}

const payableItems = computed<PayableItem[]>(() => {
  const items: PayableItem[] = [];
  tagihanList.value
    .filter((t) => t.sisaTagihan > 0)
    .forEach((t) => {
      items.push({
        key: `kuliah-${t.id}`,
        label: `Kuliah · ${t.tahunAjaran?.nama ?? '-'} Semester ${t.semester} · Sisa ${formatCurrencyIdr(t.sisaTagihan)}`,
        sisa: t.sisaTagihan,
        kind: 'KULIAH',
        tagihan: t,
      });
    });
  taSkripsiList.value.forEach((p) => {
    if (p.pendaftaran.sisa > 0) {
      items.push({
        key: `ta-pendaftaran-${p.periode}`,
        label: `TA/Skripsi Pendaftaran · Periode ${p.periode} · Sisa ${formatCurrencyIdr(p.pendaftaran.sisa)}`,
        sisa: p.pendaftaran.sisa,
        kind: 'TA_PENDAFTARAN',
        mahasiswaId: p.mahasiswaId,
        periode: p.periode,
      });
    }
    if (p.perpanjangan && p.perpanjangan.sisa > 0) {
      items.push({
        key: `ta-perpanjangan-${p.periode}`,
        label: `TA/Skripsi Perpanjangan · Periode ${p.periode} · Sisa ${formatCurrencyIdr(p.perpanjangan.sisa)}`,
        sisa: p.perpanjangan.sisa,
        kind: 'TA_PERPANJANGAN',
        mahasiswaId: p.mahasiswaId,
        periode: p.periode,
      });
    }
  });
  biayaLainList.value
    .filter((b) => b.sisa > 0)
    .forEach((b) => {
      items.push({
        key: `biaya-lain-${b.tarifLainId}`,
        label: `Biaya Lain · ${b.kodeBiaya}${b.keterangan ? ` (${b.keterangan})` : ''} · Sisa ${formatCurrencyIdr(b.sisa)}`,
        sisa: b.sisa,
        kind: 'BIAYA_LAIN',
        mahasiswaId: b.mahasiswaId,
        tarifLainId: b.tarifLainId,
      });
    });
  return items;
});

const payableOptions = computed(() => payableItems.value.map((i) => ({ value: i.key, label: i.label })));
const selectedItemKey = ref('');
const selectedItem = computed(() => payableItems.value.find((i) => i.key === selectedItemKey.value) ?? null);

watch(payableItems, (items) => {
  if (!items.some((i) => i.key === selectedItemKey.value)) {
    selectedItemKey.value = items[0]?.key ?? '';
  }
});

// ---- Form bayar ----
const isFormOpen = ref(false);
const activeItem = ref<PayableItem | null>(null);
interface FormState {
  tanggalBayar: string;
  noBukti: string;
  nominal: number | null;
  kodeBank: string;
  keterangan: string;
}
const todayIso = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): FormState => ({ tanggalBayar: todayIso(), noBukti: '', nominal: null, kodeBank: '', keterangan: '' });
const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

const openBayar = () => {
  if (!selectedItem.value) return;
  activeItem.value = selectedItem.value;
  Object.assign(form, emptyForm());
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
  isFormOpen.value = true;
};
const closeForm = () => {
  isFormOpen.value = false;
};

const onNominalInput = (event: Event) => {
  form.nominal = parseRupiahInput((event.target as HTMLInputElement).value);
};

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.tanggalBayar) errors.tanggalBayar = 'Tanggal bayar wajib diisi';
  if (!form.noBukti.trim()) errors.noBukti = 'No bukti wajib diisi';
  if (!form.nominal || form.nominal <= 0) errors.nominal = 'Nominal wajib diisi';
  if (Object.keys(errors).length > 0) return;
  if (!activeItem.value) return;

  submitting.value = true;
  formError.value = null;
  try {
    const common = {
      tanggalBayar: form.tanggalBayar,
      noBukti: form.noBukti.trim(),
      nominal: Number(form.nominal),
      kodeBank: form.kodeBank.trim() || null,
      keterangan: form.keterangan.trim() || null,
    };
    if (activeItem.value.kind === 'KULIAH' && activeItem.value.tagihan) {
      const payload: PembayaranKuliahPayload = { tagihanKuliahId: activeItem.value.tagihan.id, ...common };
      await pembayaranKuliahApi.create(payload);
    } else if (activeItem.value.kind === 'TA_PENDAFTARAN' && activeItem.value.mahasiswaId && activeItem.value.periode) {
      await pembayaranTaSkripsiApi.create({
        mahasiswaId: activeItem.value.mahasiswaId,
        periode: activeItem.value.periode,
        ...common,
      });
    } else if (activeItem.value.kind === 'TA_PERPANJANGAN' && activeItem.value.mahasiswaId && activeItem.value.periode) {
      await perpanjanganTaSkripsiApi.create({
        mahasiswaId: activeItem.value.mahasiswaId,
        periode: activeItem.value.periode,
        ...common,
      });
    } else if (activeItem.value.kind === 'BIAYA_LAIN' && activeItem.value.mahasiswaId && activeItem.value.tarifLainId) {
      await pembayaranLainApi.create({
        mahasiswaId: activeItem.value.mahasiswaId,
        tarifLainId: activeItem.value.tarifLainId,
        ...common,
      });
    }
    closeForm();
    toastSuccess('Pembayaran berhasil disimpan');
    await handleCari();
    fetchRiwayat();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pembayaran');
  } finally {
    submitting.value = false;
  }
};

// ---- Riwayat pembayaran kuliah ----
const riwayat = ref<PembayaranKuliah[]>([]);
const riwayatMeta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const riwayatPage = ref(1);
const riwayatSearch = ref('');
const riwayatLoading = ref(false);

const fetchRiwayat = async () => {
  riwayatLoading.value = true;
  try {
    const result = await pembayaranKuliahApi.list({
      page: riwayatPage.value,
      limit: 10,
      search: riwayatSearch.value || undefined,
    });
    riwayat.value = result.data;
    riwayatMeta.value = result.meta;
  } finally {
    riwayatLoading.value = false;
  }
};
fetchRiwayat();
watch(riwayatPage, fetchRiwayat);
let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(riwayatSearch, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    riwayatPage.value = 1;
    fetchRiwayat();
  }, 350);
});

const riwayatRows = computed(() =>
  riwayat.value.map((item, index) => ({ ...item, no: (riwayatPage.value - 1) * riwayatMeta.value.limit + index + 1 }))
);
const riwayatColumns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'tanggalBayar', label: 'Tanggal Bayar' },
  { key: 'noBukti', label: 'No Bukti' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
  { key: 'kodeBank', label: 'Bank' },
];
</script>

<template>
  <div>
    <PageHeader title="Pembayaran Kuliah" subtitle="Transaksi pembayaran biaya kuliah mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-72">
          <TextInput v-model="nimInput" label="NIM / Nama Mahasiswa" placeholder="Masukkan NIM atau nama..." @keyup.enter="handleCari" />
        </div>
        <AppButton icon="search" :disabled="searching" @click="handleCari">{{ searching ? 'Mencari...' : 'Cari' }}</AppButton>
      </div>

      <div v-if="searchError" class="mt-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ searchError }}
      </div>

      <div v-else-if="searched" class="mt-4">
        <p v-if="!payableItems.length" class="text-body-sm text-on-surface-variant">Tidak ada tagihan untuk pencarian ini.</p>
        <div v-else class="space-y-3">
          <p class="text-body-md font-medium text-on-surface">{{ mahasiswaLabel }}</p>
          <div class="flex flex-col md:flex-row gap-3 md:items-end">
            <div class="w-full md:w-96">
              <SelectInput v-model="selectedItemKey" label="Pilih Tagihan" :options="payableOptions" />
            </div>
            <AppButton :disabled="!selectedItem" @click="openBayar">Bayar</AppButton>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Riwayat Pembayaran Kuliah</div>
      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="riwayatSearch" placeholder="Cari NIM atau nama mahasiswa..." />
        </div>
      </div>
      <DataTable :columns="riwayatColumns" :items="riwayatRows" :loading="riwayatLoading" :show-actions="false" empty-message="Belum ada pembayaran kuliah">
        <template #cell-nim="{ item }">{{ item.tagihan?.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.tagihan?.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-tanggalBayar="{ item }">{{ formatDate(item.tanggalBayar) }}</template>
        <template #cell-nominal="{ item }">{{ formatCurrencyIdr(item.nominal) }}</template>
        <template #cell-kodeBank="{ item }">{{ item.kodeBank || '-' }}</template>
      </DataTable>
      <Pagination v-model="riwayatPage" :meta="riwayatMeta" />
    </section>

    <Modal :model-value="isFormOpen" title="Form Pembayaran" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div v-if="activeItem" class="px-3 py-2 rounded-md bg-surface-container-low text-body-sm">
          {{ mahasiswaLabel }} &middot; {{ activeItem.label }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalBayar" label="Tanggal Bayar" required :error="errors.tanggalBayar" />
          <TextInput v-model="form.noBukti" label="No Bukti" required :error="errors.noBukti" />
        </div>
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
        </label>
        <TextInput v-model="form.kodeBank" label="Kode Bank" placeholder="mis. BCA, BRI" />
        <TextInput v-model="form.keterangan" label="Keterangan" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
