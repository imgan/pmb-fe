<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { pembimbingAkademikApi, type MahasiswaBimbinganRow, type PembimbingAkademikPayload } from '@/api/pembimbingAkademik';
import { toastError, toastSuccess } from '@/utils/swal';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Dosen, PembimbingAkademik } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_PEMBIMBING_AKADEMIK_MANAGEMENT);

const dosenList = ref<Dosen[]>([]);
const loadingDosen = ref(true);
onMounted(async () => {
  try {
    const result = await dosenApi.list({ page: 1, limit: 500 });
    dosenList.value = result.data;
  } finally {
    loadingDosen.value = false;
  }
});
const dosenOptions = computed(() => dosenList.value.map((d) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` })));

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
} = useCrudPage({
  fetchList: pembimbingAkademikApi.list,
  remove: pembimbingAkademikApi.remove,
});

fetchItems();

// ---- Atur mahasiswa bimbingan (penetapan PA ke mahasiswa; dipakai untuk persetujuan KRS oleh dosen PA) ----
const aturTarget = ref<PembimbingAkademik | null>(null);
const aturStatus = ref<'bimbingan' | 'belum' | 'semua'>('belum');
const aturAngkatan = ref<number | ''>('');
const aturSearch = ref('');
const aturRows = ref<MahasiswaBimbinganRow[]>([]);
const aturLoading = ref(false);
const aturSaving = ref(false);
const aturSelected = ref<Set<number>>(new Set());
const ANGKATAN_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => ({ value: y, label: String(y) }));
const STATUS_ATUR_OPTIONS = [
  { value: 'belum', label: 'Belum punya pembimbing' },
  { value: 'bimbingan', label: 'Bimbingan dosen ini' },
  { value: 'semua', label: 'Semua mahasiswa' },
];

const loadAtur = async () => {
  if (!aturTarget.value) return;
  aturLoading.value = true;
  try {
    aturRows.value = await pembimbingAkademikApi.listMahasiswa(aturTarget.value.id, {
      status: aturStatus.value,
      angkatan: aturAngkatan.value || undefined,
      search: aturSearch.value.trim() || undefined,
    });
    aturSelected.value = new Set();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat mahasiswa'));
  } finally {
    aturLoading.value = false;
  }
};
const openAtur = (item: PembimbingAkademik) => {
  aturTarget.value = item;
  aturStatus.value = item.jumlahMahasiswa ? 'bimbingan' : 'belum';
  aturAngkatan.value = '';
  aturSearch.value = '';
  loadAtur();
};
const closeAtur = () => {
  aturTarget.value = null;
  fetchItems();
};
watch([aturStatus, aturAngkatan], loadAtur);

const isMine = (m: MahasiswaBimbinganRow) => m.pembimbingAkademikId === aturTarget.value?.id;
const allAturSelected = computed(() => aturRows.value.length > 0 && aturRows.value.every((m) => aturSelected.value.has(m.id)));
const toggleAturAll = () => {
  aturSelected.value = allAturSelected.value ? new Set() : new Set(aturRows.value.map((m) => m.id));
};
const toggleAtur = (id: number) => {
  const next = new Set(aturSelected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  aturSelected.value = next;
};
const selectedTetapkan = computed(() => aturRows.value.filter((m) => aturSelected.value.has(m.id) && !isMine(m)));
const selectedLepas = computed(() => aturRows.value.filter((m) => aturSelected.value.has(m.id) && isMine(m)));

const simpanAtur = async (aksi: 'tetapkan' | 'lepas') => {
  if (!aturTarget.value) return;
  const ids = (aksi === 'tetapkan' ? selectedTetapkan.value : selectedLepas.value).map((m) => m.id);
  if (!ids.length) return;
  aturSaving.value = true;
  try {
    const r = await pembimbingAkademikApi.setMahasiswa(aturTarget.value.id, aksi === 'tetapkan' ? { tambah: ids } : { hapus: ids });
    toastSuccess(aksi === 'tetapkan' ? `${r.ditetapkan} mahasiswa ditetapkan` : `${r.dilepas} mahasiswa dilepas`);
    await loadAtur();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan mahasiswa bimbingan'));
  } finally {
    aturSaving.value = false;
  }
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'namaDosen', label: 'Dosen' },
  { key: 'nidn', label: 'NIDN' },
  { key: 'noSk', label: 'No SK' },
  { key: 'tanggalSk', label: 'Tanggal SK', sortable: true },
  { key: 'prodi', label: 'Prodi' },
  { key: 'jumlahMahasiswa', label: 'Jumlah Mahasiswa', align: 'center' },
];

interface FormState {
  dosenId: number | '';
  noSk: string;
  tanggalSk: string;
}

const emptyForm = (): FormState => ({ dosenId: '', noSk: '', tanggalSk: '' });

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
      const item = editing as PembimbingAkademik;
      form.dosenId = item.dosenId;
      form.noSk = item.noSk ?? '';
      form.tanggalSk = item.tanggalSk?.slice(0, 10) ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.dosenId) errors.dosenId = 'Dosen wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PembimbingAkademikPayload = {
      dosenId: Number(form.dosenId),
      noSk: form.noSk.trim() || null,
      tanggalSk: form.tanggalSk || null,
    };
    if (editingItem.value) {
      await pembimbingAkademikApi.update(editingItem.value.id, payload);
    } else {
      await pembimbingAkademikApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Pembimbing Akademik" subtitle="Master data dosen pembimbing akademik (PA).">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Pembimbing Akademik</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari nama dosen atau no. SK..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data pembimbing akademik"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-namaDosen="{ item }">{{ item.dosen?.namaLengkap ?? '-' }}</template>
        <template #cell-nidn="{ item }">{{ item.dosen?.nidn || '-' }}</template>
        <template #cell-noSk="{ item }">{{ item.noSk || '-' }}</template>
        <template #cell-tanggalSk="{ item }">{{ item.tanggalSk ? formatDate(item.tanggalSk) : '-' }}</template>
        <template #cell-prodi="{ item }">{{ item.prodi.length ? item.prodi.join(', ') : '-' }}</template>
        <template #cell-jumlahMahasiswa="{ item }">{{ item.jumlahMahasiswa }}</template>
        <template #actions="{ item }">
          <button
            v-if="canUpdate"
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Atur Mahasiswa Bimbingan"
            @click="openAtur(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">group_add</span>
          </button>
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      title="Form Input Data Master Pembimbing Akademik"
      size="md"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.noSk" label="NO SK" />
          <DateInput v-model="form.tanggalSk" label="Tanggal SK" />
        </div>
        <SelectInput
          v-model="form.dosenId"
          label="Dosen"
          required
          :error="errors.dosenId"
          :disabled="loadingDosen"
          placeholder="Pilih dosen..."
          :options="dosenOptions"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal
      :model-value="!!aturTarget"
      size="lg"
      :title="`Mahasiswa Bimbingan — ${aturTarget?.dosen?.namaLengkap ?? ''}`"
      subtitle="Mahasiswa yang ditetapkan akan muncul di menu KRS Bimbingan dosen ini untuk persetujuan KRS."
      @update:model-value="closeAtur"
    >
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:items-end">
          <SelectInput v-model="aturStatus" label="Tampilkan" :options="STATUS_ATUR_OPTIONS" />
          <SelectInput v-model="aturAngkatan" label="Angkatan" placeholder="Semua angkatan" :options="ANGKATAN_OPTIONS" />
          <SearchInput v-model="aturSearch" placeholder="Cari NIM / nama..." @keyup.enter="loadAtur" />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-body-sm text-on-surface-variant">{{ aturSelected.size }} dipilih dari {{ aturRows.length }}</span>
          <AppButton icon="person_add" :disabled="aturSaving || !selectedTetapkan.length" @click="simpanAtur('tetapkan')">
            Tetapkan ke dosen ini ({{ selectedTetapkan.length }})
          </AppButton>
          <AppButton variant="secondary" icon="person_remove" :disabled="aturSaving || !selectedLepas.length" @click="simpanAtur('lepas')">
            Lepas ({{ selectedLepas.length }})
          </AppButton>
        </div>

        <div class="border border-outline-variant rounded-md max-h-96 overflow-y-auto">
          <table class="w-full text-left border-collapse text-body-sm">
            <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold sticky top-0">
              <tr>
                <th class="p-2 w-8"><input type="checkbox" class="w-4 h-4" :checked="allAturSelected" :disabled="!aturRows.length" @change="toggleAturAll" /></th>
                <th class="p-2">NIM</th>
                <th class="p-2">Nama</th>
                <th class="p-2">Prodi</th>
                <th class="p-2 text-center">Angkatan</th>
                <th class="p-2">Pembimbing Saat Ini</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-if="aturLoading"><td colspan="6" class="p-6 text-center text-on-surface-variant">Memuat...</td></tr>
              <tr v-else-if="!aturRows.length"><td colspan="6" class="p-6 text-center text-on-surface-variant">Tidak ada mahasiswa</td></tr>
              <tr v-for="m in aturRows" v-else :key="m.id" class="hover:bg-surface-container cursor-pointer" @click="toggleAtur(m.id)">
                <td class="p-2"><input type="checkbox" class="w-4 h-4" :checked="aturSelected.has(m.id)" @click.stop="toggleAtur(m.id)" /></td>
                <td class="p-2 tabular-nums">{{ m.nim }}</td>
                <td class="p-2">{{ m.namaLengkap }}</td>
                <td class="p-2">{{ m.prodi ?? '-' }}</td>
                <td class="p-2 text-center">{{ m.angkatan ?? '-' }}</td>
                <td class="p-2">
                  <span v-if="isMine(m)" class="text-[#059669] font-medium">Dosen ini</span>
                  <span v-else-if="m.pembimbing" class="text-on-surface-variant">{{ m.pembimbing }} (akan dipindah bila ditetapkan)</span>
                  <span v-else class="text-on-surface-variant">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeAtur">Tutup</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembimbing Akademik"
      :message="`Yakin ingin menghapus data pembimbing akademik ${deleteTarget?.dosen?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
