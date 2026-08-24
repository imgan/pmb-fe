<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { nilaiMahasiswaApi, type NilaiEntryUpdatePayload } from '@/api/nilaiMahasiswa';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import type { NilaiMahasiswaEntry } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const nimInput = ref('');
const kodeMkInput = ref('');
const appliedNim = ref('');
const appliedKodeMk = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<NilaiMahasiswaEntry[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);
const searched = ref(false);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'namaMataKuliah', label: 'Mata Kuliah' },
  { key: 'partisipatif', label: 'Partisipatif', align: 'center' },
  { key: 'proyek', label: 'Proyek', align: 'center' },
  { key: 'quiz', label: 'Quiz', align: 'center' },
  { key: 'tugas', label: 'Tugas', align: 'center' },
  { key: 'uts', label: 'UTS', align: 'center' },
  { key: 'uas', label: 'UAS', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await nilaiMahasiswaApi.listEntries({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      nim: appliedNim.value || undefined,
      kodeMataKuliah: appliedKodeMk.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data nilai');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedNim.value = nimInput.value.trim();
  appliedKodeMk.value = kodeMkInput.value.trim();
  page.value = 1;
  searched.value = true;
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

fetchItems();

// ---- Edit nilai ----
const isFormOpen = ref(false);
const editingItem = ref<NilaiMahasiswaEntry | null>(null);
const submitting = ref(false);
const formError = ref<string | null>(null);

const form = reactive({
  partisipatif: 0,
  proyek: 0,
  quiz: 0,
  tugas: 0,
  uts: 0,
  uas: 0,
});

const openEdit = (item: NilaiMahasiswaEntry) => {
  editingItem.value = item;
  formError.value = null;
  form.partisipatif = item.partisipatif;
  form.proyek = item.proyek;
  form.quiz = item.quiz;
  form.tugas = item.tugas;
  form.uts = item.uts;
  form.uas = item.uas;
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
    const payload: NilaiEntryUpdatePayload = {
      partisipatif: Number(form.partisipatif),
      proyek: Number(form.proyek),
      quiz: Number(form.quiz),
      tugas: Number(form.tugas),
      uts: Number(form.uts),
      uas: Number(form.uas),
    };
    await nilaiMahasiswaApi.updateEntry(editingItem.value.id, payload);
    toastSuccess('Nilai berhasil diperbarui');
    closeForm();
    fetchItems();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan nilai');
    formError.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Update Nilai" subtitle="Cari dan perbarui komponen nilai mahasiswa per mata kuliah." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <div class="w-full md:w-64">
          <TextInput v-model="kodeMkInput" placeholder="Kode Matakuliah" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Update Nilai</div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data nilai"
      >
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Ubah Nilai"
            @click="openEdit(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" title="Ubah Nilai" size="md" @update:model-value="closeForm">
      <form v-if="editingItem" class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <p class="text-body-sm text-on-surface-variant">
          {{ editingItem.mahasiswa?.nim }} - {{ editingItem.mahasiswa?.namaLengkap }}
          <span class="block">{{ editingItem.kodeMataKuliah }} - {{ editingItem.namaMataKuliah }}</span>
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.partisipatif" label="Partisipatif" type="number" />
          <TextInput v-model.number="form.proyek" label="Proyek" type="number" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.quiz" label="Quiz" type="number" />
          <TextInput v-model.number="form.tugas" label="Tugas" type="number" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.uts" label="UTS" type="number" />
          <TextInput v-model.number="form.uas" label="UAS" type="number" />
        </div>
        <p class="text-label-sm text-on-surface-variant">
          Nilai akhir &amp; grade dihitung ulang otomatis (Partisipatif 10% + Tugas 20% + UTS 30% + UAS 40%).
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
