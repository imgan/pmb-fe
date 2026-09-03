<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { tahunAjaranApi, type AktivasiTahunAjaranResult } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { TahunAjaran } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.TAHUN_AJARAN_MANAGEMENT);

const statusFilter = ref<'' | 'true' | 'false'>('');
const statusFilterOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' },
];

const {
  items,
  meta,
  page,
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
  fetchList: tahunAjaranApi.list,
  remove: tahunAjaranApi.remove,
  extraQuery: () => ({ isActive: statusFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Tahun Ajaran', sortable: true },
  { key: 'jenisSemester', label: 'Semester', align: 'center' },
  { key: 'tahunMulai', label: 'Tahun Mulai', align: 'center', sortable: true },
  { key: 'tahunSelesai', label: 'Tahun Selesai', align: 'center', sortable: true },
  { key: 'isActive', label: 'Status', align: 'center', sortable: true },
];

const JENIS_SEMESTER_OPTIONS = [
  { value: 'GANJIL', label: 'Ganjil' },
  { value: 'GENAP', label: 'Genap' },
];

const form = reactive({
  nama: '',
  tahunMulai: new Date().getFullYear() as number | '',
  tahunSelesai: new Date().getFullYear() + 1 as number | '',
  jenisSemester: 'GANJIL' as 'GANJIL' | 'GENAP',
  isActive: true,
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
    if (editing) {
      form.nama = editing.nama;
      form.tahunMulai = editing.tahunMulai;
      form.tahunSelesai = editing.tahunSelesai;
      form.jenisSemester = editing.jenisSemester;
      form.isActive = editing.isActive;
    } else {
      const year = new Date().getFullYear();
      form.nama = `${year}/${year + 1}`;
      form.tahunMulai = year;
      form.tahunSelesai = year + 1;
      form.jenisSemester = 'GANJIL';
      form.isActive = true;
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nama.trim()) errors.nama = 'Nama tahun ajaran wajib diisi';
  if (!form.tahunMulai) errors.tahunMulai = 'Tahun mulai wajib diisi';
  if (!form.tahunSelesai) errors.tahunSelesai = 'Tahun selesai wajib diisi';
  if (form.tahunMulai && form.tahunSelesai && Number(form.tahunSelesai) <= Number(form.tahunMulai)) {
    errors.tahunSelesai = 'Tahun selesai harus lebih besar dari tahun mulai';
  }
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      nama: form.nama.trim(),
      tahunMulai: Number(form.tahunMulai),
      tahunSelesai: Number(form.tahunSelesai),
      jenisSemester: form.jenisSemester,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await tahunAjaranApi.update(editingItem.value.id, payload);
    } else {
      await tahunAjaranApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan tahun ajaran');
  } finally {
    submitting.value = false;
  }
};

// ---- Aktifkan periode (trigger "naik semester" — lihat catatan di tahunAjaran.service.js) ----
const activateTarget = ref<TahunAjaran | null>(null);
const activating = ref(false);
const activationResult = ref<AktivasiTahunAjaranResult | null>(null);

const requestActivate = (item: TahunAjaran) => {
  activateTarget.value = item;
};
const cancelActivate = () => {
  activateTarget.value = null;
};
const confirmActivate = async () => {
  if (!activateTarget.value) return;
  activating.value = true;
  try {
    const result = await tahunAjaranApi.activate(activateTarget.value.id);
    activateTarget.value = null;
    activationResult.value = result;
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengaktifkan tahun ajaran'));
  } finally {
    activating.value = false;
  }
};
const closeActivationResult = () => {
  activationResult.value = null;
};
</script>

<template>
  <div>
    <PageHeader
      title="Tahun Ajaran"
      subtitle="Kelola tahun ajaran. Hanya tahun ajaran aktif yang bisa dipilih saat generate NIM mahasiswa & membuat jadwal kuliah."
    >
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Tahun Ajaran</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari tahun ajaran..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="statusFilterOptions" @change="onFilterChange" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data tahun ajaran"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-jenisSemester="{ item }">{{ item.jenisSemester === 'GENAP' ? 'Genap' : 'Ganjil' }}</template>
        <template #cell-isActive="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Non-aktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <button
            v-if="canUpdate && !item.isActive"
            type="button"
            class="px-2.5 py-1 rounded-md bg-primary text-on-primary text-label-sm hover:opacity-90 transition-opacity"
            title="Aktifkan periode ini — akan menaikkan semester berjalan seluruh mahasiswa aktif"
            @click="requestActivate(item)"
          >
            Aktifkan
          </button>
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran'"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.nama" label="Nama Tahun Ajaran" required placeholder="mis. 2026/2027" :error="errors.nama" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.tahunMulai" label="Tahun Mulai" type="number" required :error="errors.tahunMulai" />
          <TextInput v-model.number="form.tahunSelesai" label="Tahun Selesai" type="number" required :error="errors.tahunSelesai" />
        </div>
        <SelectInput
          v-model="form.jenisSemester"
          label="Semester"
          required
          :options="JENIS_SEMESTER_OPTIONS"
        />
        <p class="text-label-sm text-on-surface-variant -mt-2">
          Dipakai untuk menghitung otomatis semester berjalan mahasiswa di KRS — pastikan sesuai
          periode yang sebenarnya (Ganjil/Genap) supaya hitungannya benar.
        </p>
        <CheckboxToggle
          v-model="form.isActive"
          label="Status Aktif"
          description="Hanya tahun ajaran aktif yang muncul sebagai pilihan saat generate NIM & membuat jadwal kuliah"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">
          {{ submitting ? 'Menyimpan...' : 'Simpan' }}
        </AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tahun Ajaran"
      :message="`Yakin ingin menghapus tahun ajaran ${deleteTarget?.nama ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <ConfirmDialog
      :open="!!activateTarget"
      title="Aktifkan Tahun Ajaran"
      :message="`Aktifkan ${activateTarget?.nama ?? ''} (${activateTarget?.jenisSemester === 'GENAP' ? 'Genap' : 'Ganjil'})? Tahun ajaran lain akan dinonaktifkan, dan semester berjalan seluruh mahasiswa aktif otomatis naik mengikuti periode ini.`"
      :loading="activating"
      @confirm="confirmActivate"
      @cancel="cancelActivate"
    />

    <Modal
      :model-value="!!activationResult"
      title="Tahun Ajaran Diaktifkan"
      size="lg"
      @update:model-value="closeActivationResult"
    >
      <div v-if="activationResult" class="space-y-4">
        <p class="text-body-sm text-on-surface">
          <strong>{{ activationResult.tahunAjaran.nama }}</strong>
          ({{ activationResult.tahunAjaran.jenisSemester === 'GENAP' ? 'Genap' : 'Ganjil' }}) sekarang aktif.
          Semester berjalan {{ activationResult.totalMahasiswaAktif }} mahasiswa aktif sudah otomatis naik
          mengikuti periode ini.
        </p>

        <div v-if="activationResult.cutiDiproses.length" class="space-y-2">
          <p class="px-3 py-2 rounded-md bg-surface-container text-on-surface text-body-sm">
            {{ activationResult.cutiDiproses.length }} mahasiswa sedang cuti — jumlah semester cuti mereka
            otomatis bertambah 1 untuk periode ini (tidak ikut naik semester selama masih cuti).
          </p>
          <div class="border border-outline-variant rounded-md max-h-40 overflow-y-auto">
            <table class="w-full text-left text-body-sm">
              <thead class="bg-surface-container-low sticky top-0">
                <tr>
                  <th class="p-2 font-semibold text-on-surface-variant">NIM</th>
                  <th class="p-2 font-semibold text-on-surface-variant">Nama</th>
                  <th class="p-2 font-semibold text-on-surface-variant text-center">Jumlah Semester Cuti</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="mhs in activationResult.cutiDiproses" :key="mhs.id">
                  <td class="p-2">{{ mhs.nim }}</td>
                  <td class="p-2">{{ mhs.namaLengkap }}</td>
                  <td class="p-2 text-center">{{ mhs.jumlahSemesterCutiBaru }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activationResult.melebihiMasaStudi.length" class="space-y-2">
          <p class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ activationResult.melebihiMasaStudi.length }} mahasiswa semesternya sudah melebihi batas wajar
            masa studi ({{ activationResult.maxSemesterWajar }} semester) — perlu ditinjau manual di menu
            Masa Studi (evaluasi DO, bukan otomatis diubah statusnya).
          </p>
          <div class="border border-outline-variant rounded-md max-h-56 overflow-y-auto">
            <table class="w-full text-left text-body-sm">
              <thead class="bg-surface-container-low sticky top-0">
                <tr>
                  <th class="p-2 font-semibold text-on-surface-variant">NIM</th>
                  <th class="p-2 font-semibold text-on-surface-variant">Nama</th>
                  <th class="p-2 font-semibold text-on-surface-variant text-center">Semester</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="mhs in activationResult.melebihiMasaStudi" :key="mhs.id">
                  <td class="p-2">{{ mhs.nim }}</td>
                  <td class="p-2">{{ mhs.namaLengkap }}</td>
                  <td class="p-2 text-center">{{ mhs.semester }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p v-else class="text-body-sm text-on-surface-variant">
          Tidak ada mahasiswa yang melebihi batas wajar masa studi ({{ activationResult.maxSemesterWajar }} semester).
        </p>
      </div>
      <template #footer>
        <AppButton @click="closeActivationResult">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>
