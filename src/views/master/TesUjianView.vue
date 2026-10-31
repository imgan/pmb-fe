<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import PesertaUjianModal from '@/components/tesUjian/PesertaUjianModal.vue';
import { tesUjianApi, type TesUjian } from '@/api/tesUjian';
import { gelombangApi } from '@/api/gelombang';
import { jurusanApi } from '@/api/jurusan';
import { bankUjianApi } from '@/api/bankUjian';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate, toDateInputValue } from '@/utils/format';
import type { Gelombang } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.TES_UJIAN_MANAGEMENT);

const {
  items,
  meta,
  page,
  limit,
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
} = useCrudPage<TesUjian>({ fetchList: tesUjianApi.list, remove: tesUjianApi.remove });

fetchItems();

const gelombangList = ref<Gelombang[]>([]);
gelombangApi
  .list({ limit: 200 })
  .then((r) => (gelombangList.value = r.data))
  .catch(() => (gelombangList.value = []));
const gelombangOptions = computed(() => gelombangList.value.map((g) => ({ value: g.id, label: g.namaGelombang })));

// Jurusan = nama prodi (unik; master jurusan punya varian per golongan kelas). Kosong = Semua Jurusan.
const prodiOptions = ref<{ value: string; label: string }[]>([]);
jurusanApi
  .listProdi()
  .then((r) => (prodiOptions.value = r.data.map((j) => ({ value: j.namaJurusan, label: j.namaJurusan }))))
  .catch(() => (prodiOptions.value = []));

// Paket soal online dari LMS → Kuis & Ujian → Bank Ujian. Kosong = tes tanpa soal online (offline).
const bankOptions = ref<{ value: number; label: string }[]>([]);
bankUjianApi
  .opsi()
  .then((r) =>
    (bankOptions.value = r.map((b) => ({
      value: b.id,
      label: `${b.judul} (${b.jumlahPg} PG, ${b.jumlahEssay} essay${b.durasiMenit ? `, ${b.durasiMenit} menit` : ''})`,
    })))
  )
  .catch(() => (bankOptions.value = []));

const columns: DataTableColumn[] = [
  { key: 'namaUjian', label: 'Ujian Tes', sortable: true },
  { key: 'gelombang', label: 'Gelombang', sortable: true },
  { key: 'tanggal', label: 'Tanggal', sortable: true },
  { key: 'peserta', label: '', align: 'center' },
];

const form = reactive({
  namaUjian: '',
  gelombangId: '' as number | string | null,
  prodi: '' as number | string | null,
  tanggal: '',
  lokasi: '',
  waktu: '',
  bankUjianId: '' as number | string | null,
});
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.namaUjian = editing?.namaUjian ?? '';
    form.gelombangId = editing?.gelombangId ?? '';
    form.prodi = editing?.prodi ?? '';
    form.tanggal = toDateInputValue(editing?.tanggal);
    form.lokasi = editing?.lokasi ?? '';
    form.waktu = editing?.waktu ?? '';
    form.bankUjianId = editing?.bankUjianId ?? '';
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.namaUjian.trim()) errors.namaUjian = 'Nama ujian wajib diisi';
  if (!form.gelombangId) errors.gelombangId = 'Gelombang wajib dipilih';
  if (!form.tanggal) errors.tanggal = 'Tanggal wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      namaUjian: form.namaUjian.trim(),
      gelombangId: Number(form.gelombangId),
      prodi: form.prodi ? String(form.prodi) : null,
      tanggal: form.tanggal,
      lokasi: form.lokasi.trim() || null,
      waktu: form.waktu.trim() || null,
      bankUjianId: form.bankUjianId ? Number(form.bankUjianId) : null,
    };
    if (editingItem.value) await tesUjianApi.update(editingItem.value.id, payload);
    else await tesUjianApi.create(payload);
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan tes ujian');
  } finally {
    submitting.value = false;
  }
};

const pesertaOpen = ref(false);
const pesertaTes = ref<TesUjian | null>(null);
const bukaPeserta = (item: TesUjian) => {
  pesertaTes.value = item;
  pesertaOpen.value = true;
};
</script>

<template>
  <div>
    <PageHeader title="Tes Ujian" subtitle="Kelola jadwal tes seleksi per gelombang dan peserta yang berhak mengikuti ujian.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari nama ujian..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" empty-message="Belum ada tes ujian" @sort="handleSort">
        <template #cell-gelombang="{ item }">
          <p>{{ item.gelombang?.namaGelombang ?? '-' }}</p>
          <p class="text-label-sm italic text-on-surface-variant">{{ item.prodi || 'Semua Jurusan' }}</p>
        </template>
        <template #cell-tanggal="{ item }">
          <p class="tabular-nums whitespace-nowrap">{{ formatDate(item.tanggal) }}</p>
          <p class="text-label-sm italic" :class="item.bankUjian ? 'text-primary' : 'text-on-surface-variant'">
            - Soal : {{ item.bankUjian ? item.bankUjian.judul : 'Tidak ada (offline)' }}
          </p>
          <p v-if="item.lokasi" class="text-label-sm italic text-on-surface-variant">- Lokasi : {{ item.lokasi }}</p>
          <p v-if="item.waktu" class="text-label-sm italic text-on-surface-variant">- Waktu : {{ item.waktu }}</p>
        </template>
        <template #cell-peserta="{ item }">
          <AppButton icon="group" @click="bukaPeserta(item)">Daftar Peserta ({{ item.jumlahPeserta ?? 0 }})</AppButton>
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Tes Ujian' : 'Tambah Tes Ujian'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <TextInput v-model="form.namaUjian" label="Nama Ujian" required placeholder="mis. Tes Ujian Gelombang I 2026" :error="errors.namaUjian" />
        <SelectInput v-model="form.gelombangId" label="Gelombang" required :options="gelombangOptions" placeholder="Pilih gelombang" :error="errors.gelombangId" />
        <SelectInput v-model="form.prodi" label="Jurusan" :options="prodiOptions" placeholder="Semua Jurusan" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggal" label="Tanggal" required :error="errors.tanggal" />
          <TextInput v-model="form.waktu" label="Waktu" placeholder="mis. 09:00 - 15:00" />
        </div>
        <div>
          <SelectInput v-model="form.bankUjianId" label="Paket Soal Online (LMS Bank Ujian)" :options="bankOptions" placeholder="Tanpa soal online" />
          <p class="mt-1 text-label-sm text-on-surface-variant">
            Peserta mengerjakan soal ini di portal pada tanggal tes. Paket soal dibuat di LMS → Kuis & Ujian → Bank Ujian.
          </p>
        </div>
        <TextareaInput v-model="form.lokasi" label="Lokasi" :rows="2" placeholder="mis. Gedung 1 - Lab. Pemrograman, atau Via Online" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <PesertaUjianModal v-model="pesertaOpen" :tes="pesertaTes" :can-update="canUpdate" @changed="fetchItems" />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tes Ujian"
      :message="`Yakin ingin menghapus ${deleteTarget?.namaUjian ?? ''}? Daftar peserta & nilai ujian ini ikut terhapus.`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
