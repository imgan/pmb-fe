<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { yudisiumApi, type YudisiumPayload } from '@/api/yudisium';
import { jurusanApi } from '@/api/jurusan';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatDate, toDateInputValue } from '@/utils/format';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastError, toastSuccess } from '@/utils/swal';
import type { Yudisium } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const { canUpdate } = usePermission(MENU.YUDISIUM_MANAGEMENT);

const jurusanOptions = ref<{ value: number; label: string }[]>([]);
const selectedJurusan = ref<number | ''>('');
const appliedJurusan = ref<number | ''>('');

const nimInput = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<Yudisium[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const columns: DataTableColumn[] = [
  { key: 'mahasiswa', label: 'NPM / Nama' },
  { key: 'noSk', label: 'No. SK' },
  { key: 'tanggalSk', label: 'Tanggal SK' },
  { key: 'tanggalYudisium', label: 'Tanggal Yudisium' },
  { key: 'pin', label: 'PIN' },
  { key: 'judul', label: 'Judul' },
  { key: 'ipk', label: 'IPK', align: 'center' },
  { key: 'predikat', label: 'Predikat', align: 'center' },
];

const pembimbingLine = (item: Yudisium) => {
  const names = [item.pembimbing1?.namaLengkap, item.pembimbing2?.namaLengkap].filter(Boolean);
  return names.length ? names.join(' & ') : '-';
};

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await yudisiumApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      jurusanId: appliedJurusan.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data laporan yudisium');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedJurusan.value = selectedJurusan.value;
  search.value = nimInput.value.trim();
  page.value = 1;
  fetchItems();
};

watch(page, fetchItems);
watch(pageSize, () => {
  page.value = 1;
  fetchItems();
});

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

onMounted(async () => {
  try {
    const result = await jurusanApi.listProdi({ limit: 100 });
    jurusanOptions.value = result.data.map((j) => ({ value: j.id, label: j.namaJurusan.toUpperCase() }));
  } catch {
    jurusanOptions.value = [];
  }
  fetchItems();
});

// ---- Update modal ----
const isFormOpen = ref(false);
const editingItem = ref<Yudisium | null>(null);
const submitting = ref(false);
const formError = ref<string | null>(null);

const form = reactive({
  noSk: '',
  tanggalSk: '',
  tanggalYudisium: '',
  pin: '',
  judul: '',
  namaAyah: '',
  namaIbu: '',
});

const openEdit = (item: Yudisium) => {
  editingItem.value = item;
  formError.value = null;
  form.noSk = item.noSk ?? '';
  form.tanggalSk = toDateInputValue(item.tanggalSk);
  form.tanggalYudisium = toDateInputValue(item.tanggalYudisium);
  form.pin = item.pin ?? '';
  form.judul = item.judul ?? '';
  form.namaAyah = item.mahasiswa?.biodata?.namaAyah ?? '';
  form.namaIbu = item.mahasiswa?.biodata?.namaIbu ?? '';
  isFormOpen.value = true;
};

const closeForm = () => {
  isFormOpen.value = false;
  editingItem.value = null;
};

const handleSubmit = async () => {
  if (!editingItem.value) return;
  submitting.value = true;
  formError.value = null;
  try {
    const payload: YudisiumPayload = {
      noSk: form.noSk.trim() || null,
      tanggalSk: form.tanggalSk || null,
      tanggalYudisium: form.tanggalYudisium || null,
      pin: form.pin.trim() || null,
      judul: form.judul.trim() || null,
    };
    await Promise.all([
      yudisiumApi.update(editingItem.value.id, payload),
      mahasiswaApi.saveBiodata(editingItem.value.mahasiswaId, {
        namaAyah: form.namaAyah.trim() || null,
        namaIbu: form.namaIbu.trim() || null,
      }),
    ]);
    toastSuccess('Data yudisium berhasil disimpan');
    closeForm();
    fetchItems();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan data yudisium');
    formError.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Laporan Yudisium" subtitle="Kelola No. SK, tanggal yudisium, PIN, dan judul skripsi mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedJurusan" placeholder="-- Pilih Program --" :options="jurusanOptions" />
        </div>
        <div class="w-full md:w-64">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Laporan Yudisium
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :show-actions="canUpdate" empty-message="Belum ada data yudisium">
        <template #cell-mahasiswa="{ item }">
          <p class="font-medium text-on-surface">{{ item.mahasiswa?.nim }}</p>
          <p class="text-on-surface">{{ item.mahasiswa?.namaLengkap?.toUpperCase() }}</p>
          <p class="text-label-sm text-on-surface-variant">
            {{ item.mahasiswa?.biodata?.tempatLahir ?? '-' }}, {{ formatDate(item.mahasiswa?.biodata?.tanggalLahir) }}
          </p>
          <p class="text-label-sm text-on-surface-variant">{{ pembimbingLine(item) }}</p>
        </template>
        <template #cell-noSk="{ item }">{{ item.noSk ?? '-' }}</template>
        <template #cell-tanggalSk="{ item }">{{ item.tanggalSk ? formatDate(item.tanggalSk) : '-' }}</template>
        <template #cell-tanggalYudisium="{ item }">{{ item.tanggalYudisium ? formatDate(item.tanggalYudisium) : '-' }}</template>
        <template #cell-pin="{ item }">{{ item.pin ?? '-' }}</template>
        <template #cell-judul="{ item }">{{ item.judul ?? '-' }}</template>
        <template #cell-ipk="{ item }">{{ item.ipk != null ? item.ipk.toFixed(2) : '-' }}</template>
        <template #cell-predikat="{ item }">{{ item.predikat ?? '-' }}</template>
        <template #actions="{ item }">
          <AppButton @click="openEdit(item)">Update</AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" title="Update Data Yudisium" size="lg" @update:model-value="closeForm">
      <form v-if="editingItem" class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="md:col-span-2 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <TextInput :model-value="editingItem.mahasiswa?.nim" label="NIM" disabled />
        <TextInput v-model="form.namaAyah" label="Nama Ayah" />
        <TextInput :model-value="editingItem.mahasiswa?.namaLengkap" label="Nama" disabled />
        <TextInput v-model="form.namaIbu" label="Nama Ibu" />
        <TextInput :model-value="toDateInputValue(editingItem.mahasiswa?.biodata?.tanggalLahir)" label="Tanggal Lahir" disabled />
        <div />

        <TextInput v-model="form.noSk" label="No. SK" />
        <DateInput v-model="form.tanggalSk" label="Tanggal SK" />
        <TextInput v-model="form.pin" label="PIN" />
        <DateInput v-model="form.tanggalYudisium" label="Tanggal Yudisium" />
        <TextareaInput v-model="form.judul" label="Judul" class="md:col-span-2" :rows="4" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
