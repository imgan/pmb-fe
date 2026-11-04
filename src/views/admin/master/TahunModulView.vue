<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { tahunModulApi, type ModulTahun } from '@/api/tahunModul';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import type { SemesterGanjilGenap, TahunModul } from '@/types/entities';

/**
 * Tab PMB / Keuangan / FRS / TA-Skripsi / SP pada Modul Admin › Tahun: CRUD tahun per modul,
 * data periode tersendiri yang terpisah dari tahun akademik (Tahun Ajaran), dengan satu tahun aktif per modul.
 */
const props = defineProps<{ modul: ModulTahun; menuCode: string }>();
const modul = props.modul;
const api = tahunModulApi(modul);
const { canCreate, canUpdate, canDelete } = usePermission(props.menuCode);
const INFO = {
  pmb: {
    judul: 'Tahun Ajaran PMB',
    sub: 'Periode penerimaan mahasiswa baru — terpisah dari tahun akademik.',
    dampak: ['Gelombang pendaftaran dikelompokkan per Tahun Ajaran PMB; gelombang baru otomatis memakai tahun aktif.', 'Formulir pendaftaran website mengutamakan gelombang pada tahun PMB aktif.', 'Filter Tahun PMB di Data Calon Mahasiswa Baru.', 'Pilihan tahun bawaan saat login modul PMB.'],
  },
  keuangan: {
    judul: 'Tahun Ajaran Keuangan',
    sub: 'Periode tagihan kasir & keuangan — terpisah dari tahun akademik.',
    dampak: ['Semester tagihan berjalan untuk Batas Tagihan Akademik (cekal KRS / UTS / nilai).', 'Pilihan tahun bawaan saat login modul Keuangan.', 'Tahun dicocokkan dengan tahun akademik bernama & semester sama untuk data tagihan.'],
  },
  frs: {
    judul: 'Tahun FRS',
    sub: 'Periode pengisian Formulir Rencana Studi — terpisah dari tahun akademik.',
    keterangan: true,
    dampak: ['Periode pengisian KRS di portal mahasiswa: mata kuliah, semester, dan pengajuan mengikuti tahun aktif di sini.', 'Bawaan daftar mahasiswa belum mengisi KRS (BAAK & Prodi) dan laporan FRS di modul SIM.', 'Perlu Tahun Akademik dengan nama & semester yang sama; bila belum ada, sistem memakai tahun akademik aktif.', 'Kehadiran, nilai, dan jadwal tetap mengikuti tahun akademik aktif.'],
  },
  'ta-skripsi': {
    judul: 'Tahun TA/Skripsi',
    sub: 'Periode proses Tugas Akhir/Skripsi — terpisah dari tahun akademik.',
    dampak: ['Pilihan tahun pada Keuangan › Master › Tarif TA/Skripsi; tarif baru otomatis memakai tahun aktif.'],
  },
  sp: {
    judul: 'Tahun SP',
    sub: 'Periode Semester Pendek — terpisah dari tahun akademik.',
    keterangan: true,
    dampak: ['Disiapkan untuk periode Semester Pendek.', 'Belum terhubung ke menu lain: tahun aktif di sini belum memengaruhi KRS, pembayaran, maupun laporan Semester Pendek.'],
  },
}[modul];

const statusFilter = ref<'' | 'true' | 'false'>('');
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
} = useCrudPage({ fetchList: api.list, remove: api.remove, extraQuery: () => ({ isActive: statusFilter.value || undefined }) });
fetchItems();
const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const label = (t?: Pick<TahunModul, 'nama' | 'jenisSemester'> | null) => (t ? `${t.nama} ${t.jenisSemester === 'GENAP' ? 'Genap' : 'Ganjil'}` : '-');
const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Tahun Ajaran', sortable: true },
  { key: 'jenisSemester', label: 'Semester' },
  { key: 'periode', label: 'Periode' },
  { key: 'isActive', label: 'Status', align: 'center', sortable: true },
];

// Form tambah / ubah.
const SEMESTER = [
  { value: 'GANJIL', label: 'Ganjil' },
  { value: 'GENAP', label: 'Genap' },
];
const form = reactive({ nama: '', tahunMulai: new Date().getFullYear() as number | string, tahunSelesai: new Date().getFullYear() + 1 as number | string, jenisSemester: 'GANJIL' as string | number | null, isActive: false });
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);
watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, e]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    const th = new Date().getFullYear();
    form.nama = e?.nama ?? `${th}/${th + 1}`;
    form.tahunMulai = e?.tahunMulai ?? th;
    form.tahunSelesai = e?.tahunSelesai ?? th + 1;
    form.jenisSemester = e?.jenisSemester ?? 'GANJIL';
    form.isActive = e?.isActive ?? false;
  },
  { immediate: true }
);
// Nama mengikuti tahun mulai/selesai (masih bisa diubah manual).
watch(
  () => [form.tahunMulai, form.tahunSelesai],
  ([a, b], lama) => {
    if (lama && form.nama === `${lama[0]}/${lama[1]}`) form.nama = `${a}/${b}`;
  }
);
const simpan = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  const mulai = Number(form.tahunMulai);
  const selesai = Number(form.tahunSelesai);
  if (!form.nama.trim()) errors.nama = 'Nama tahun ajaran wajib diisi';
  if (!mulai || mulai < 2000 || mulai > 2100) errors.tahunMulai = 'Tahun mulai tidak valid';
  if (!selesai || selesai < mulai) errors.tahunSelesai = 'Tahun selesai harus ≥ tahun mulai';
  if (Object.keys(errors).length) return;
  submitting.value = true;
  formError.value = null;
  try {
    const payload = { nama: form.nama.trim(), tahunMulai: mulai, tahunSelesai: selesai, jenisSemester: form.jenisSemester as SemesterGanjilGenap, isActive: form.isActive };
    if (editingItem.value) await api.update(editingItem.value.id, payload);
    else await api.create(payload);
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, `Gagal menyimpan ${INFO.judul.toLowerCase()}`);
  } finally {
    submitting.value = false;
  }
};

const aktifkan = async (t: TahunModul) => {
  const ok = await confirmAction({ title: `Aktifkan ${label(t)}?`, text: `${INFO.judul} lain akan dinonaktifkan. Tahun akademik dan modul lain tidak berubah.`, confirmLabel: 'Ya, aktifkan', danger: false });
  if (!ok) return;
  try {
    await api.activate(t.id);
    toastSuccess(`${INFO.judul} aktif: ${label(t)}`);
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengaktifkan tahun'));
  }
};
</script>

<template>
  <div>
    <PageHeader :title="INFO.judul" :subtitle="INFO.sub">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah {{ INFO.judul }}</AppButton>
      </template>
    </PageHeader>

    <section class="mb-6 rounded-lg border border-outline-variant bg-primary-container/30 p-4 text-body-sm">
      <p class="font-semibold text-on-surface mb-1">{{ 'keterangan' in INFO ? `Keterangan ${INFO.judul}:` : `${INFO.judul} aktif dipakai untuk:` }}</p>
      <ul class="list-disc pl-5 text-on-surface-variant space-y-0.5">
        <li v-for="d in INFO.dampak" :key="d">{{ d }}</li>
      </ul>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row gap-3">
        <div class="flex-1"><SearchInput v-model="search" placeholder="Cari tahun ajaran..." /></div>
        <div class="w-full md:w-56">
          <SelectInput
            v-model="statusFilter"
            placeholder="Semua Status"
            :options="[
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Non-aktif' },
            ]"
            @change="onFilterChange"
          />
        </div>
      </div>
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div class="px-4 py-3 border-b border-outline-variant"><PageSizeSelect v-model="limit" /></div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-nama="{ item }"><span class="font-semibold">{{ item.nama }}</span></template>
        <template #cell-jenisSemester="{ item }">{{ item.jenisSemester === 'GENAP' ? 'Genap' : 'Ganjil' }}</template>
        <template #cell-periode="{ item }"><span class="tabular-nums">{{ item.tahunMulai }} – {{ item.tahunSelesai }}</span></template>
        <template #cell-isActive="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'neutral'" :label="item.isActive ? 'Aktif' : 'Non-aktif'" />
        </template>
        <template #actions="{ item }">
          <div class="flex items-center justify-end gap-2">
            <button
              v-if="canUpdate && !item.isActive"
              type="button"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary text-primary text-label-sm font-semibold hover:bg-primary-container/40"
              @click="aktifkan(item)"
            >
              <span class="material-symbols-outlined" style="font-size: 15px">check_circle</span>Aktifkan
            </button>
            <RowActions :can-update="canUpdate" :can-delete="canDelete && !item.isActive" @edit="openEdit(item)" @delete="requestDelete(item)" />
          </div>
        </template>
      </DataTable>
      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? `Ubah ${INFO.judul}` : `Tambah ${INFO.judul}`" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.tahunMulai" label="Tahun Mulai" type="number" required :error="errors.tahunMulai" />
          <TextInput v-model.number="form.tahunSelesai" label="Tahun Selesai" type="number" required :error="errors.tahunSelesai" />
        </div>
        <TextInput v-model="form.nama" label="Nama Tahun Ajaran" required placeholder="mis. 2027/2028" :error="errors.nama" />
        <SelectInput v-model="form.jenisSemester" label="Semester" required :clearable="false" :options="SEMESTER" />
        <CheckboxToggle v-model="form.isActive" label="Jadikan tahun aktif" :description="`${INFO.judul} lain otomatis dinonaktifkan.`" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="simpan">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      :title="`Hapus ${INFO.judul}`"
      :message="`Yakin ingin menghapus ${label(deleteTarget)}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
