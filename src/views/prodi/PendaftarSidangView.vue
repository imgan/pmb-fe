<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { pendaftarSidangApi, type PendaftarSidangPayload } from '@/api/pendaftarSidang';
import { jadwalSidangApi } from '@/api/jadwalSidang';
import { mahasiswaApi } from '@/api/mahasiswa';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastError, toastSuccess } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { Dosen, JadwalSidang, Mahasiswa, PendaftarSidang } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_PENDAFTAR_SIDANG_MANAGEMENT);

const tanggalOptions = ref<{ value: string; label: string }[]>([]);
const ruanganOptions = ref<{ value: string; label: string }[]>([]);
const selectedTanggal = ref('');
const selectedRuangan = ref('');
const appliedTanggal = ref('');
const appliedRuangan = ref('');

const mahasiswaList = ref<Mahasiswa[]>([]);
const dosenList = ref<Dosen[]>([]);
const jadwalSidangList = ref<JadwalSidang[]>([]);
const loadingOptions = ref(true);

const mahasiswaOptions = computed(() => mahasiswaList.value.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` })));
const dosenOptions = computed(() => dosenList.value.map((d) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` })));
const jadwalSidangOptions = computed(() =>
  jadwalSidangList.value.map((j) => ({
    value: j.id,
    label: `${formatDate(j.tanggal)} - ${j.jam} - ${j.ruangan ?? 'Ruang belum ditentukan'}`,
  }))
);

onMounted(async () => {
  try {
    const [filterResult, mahasiswaResult, dosenResult, jadwalSidangResult] = await Promise.all([
      pendaftarSidangApi.filterOptions(),
      mahasiswaApi.list({ limit: 500 }),
      dosenApi.list({ page: 1, limit: 500 }),
      jadwalSidangApi.list({ page: 1, limit: 200 }),
    ]);
    tanggalOptions.value = filterResult.tanggal.map((t) => ({ value: t, label: formatDate(t) }));
    ruanganOptions.value = filterResult.ruangan.map((r) => ({ value: r, label: r }));
    mahasiswaList.value = mahasiswaResult.data;
    dosenList.value = dosenResult.data;
    jadwalSidangList.value = jadwalSidangResult.data;
  } finally {
    loadingOptions.value = false;
  }
});

const {
  items,
  meta,
  page,
  search,
  loading,
  error,
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
  fetchList: pendaftarSidangApi.list,
  remove: pendaftarSidangApi.remove,
  extraQuery: () => ({ tanggal: appliedTanggal.value || undefined, ruangan: appliedRuangan.value || undefined }),
});

const handleTampil = () => {
  appliedTanggal.value = selectedTanggal.value;
  appliedRuangan.value = selectedRuangan.value;
  page.value = 1;
  fetchItems();
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'npm', label: 'NPM' },
  { key: 'namaJudul', label: 'Nama / Judul' },
  { key: 'ganti_ruang', label: 'Ganti Ruang', align: 'center' },
  { key: 'pembimbing', label: 'Pembimbing' },
  { key: 'penguji', label: 'Penguji' },
];

const pembimbingLine = (item: PendaftarSidang) => {
  const names = [item.pembimbing1?.namaLengkap, item.pembimbing2?.namaLengkap].filter(Boolean);
  return names.length ? names.join(' & ') : '-';
};

// ---- Tambah / Ubah ----
const form = reactive({
  mahasiswaId: '' as number | '',
  judul: '',
  pembimbing1Id: '' as number | '',
  pembimbing2Id: '' as number | '',
  jadwalSidangId: '' as number | '',
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
      const item = editing as PendaftarSidang;
      form.mahasiswaId = item.mahasiswaId;
      form.judul = item.judul;
      form.pembimbing1Id = item.pembimbing1Id ?? '';
      form.pembimbing2Id = item.pembimbing2Id ?? '';
      form.jadwalSidangId = item.jadwalSidangId ?? '';
    } else {
      form.mahasiswaId = '';
      form.judul = '';
      form.pembimbing1Id = '';
      form.pembimbing2Id = '';
      form.jadwalSidangId = '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (!form.judul.trim()) errors.judul = 'Judul wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: PendaftarSidangPayload = {
      mahasiswaId: Number(form.mahasiswaId),
      judul: form.judul.trim(),
      pembimbing1Id: form.pembimbing1Id ? Number(form.pembimbing1Id) : null,
      pembimbing2Id: form.pembimbing2Id ? Number(form.pembimbing2Id) : null,
      jadwalSidangId: form.jadwalSidangId ? Number(form.jadwalSidangId) : null,
    };
    if (editingItem.value) {
      await pendaftarSidangApi.update(editingItem.value.id, payload);
    } else {
      await pendaftarSidangApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data pendaftar sidang');
  } finally {
    submitting.value = false;
  }
};

// ---- Ganti Ruang (aksi cepat, pisah dari form Ubah lengkap) ----
const isGantiRuangOpen = ref(false);
const gantiRuangTarget = ref<PendaftarSidang | null>(null);
const gantiRuangJadwalSidangId = ref<number | ''>('');
const gantiRuangSubmitting = ref(false);
const gantiRuangError = ref<string | null>(null);

const openGantiRuang = (item: PendaftarSidang) => {
  gantiRuangTarget.value = item;
  gantiRuangJadwalSidangId.value = item.jadwalSidangId ?? '';
  gantiRuangError.value = null;
  isGantiRuangOpen.value = true;
};

const closeGantiRuang = () => {
  isGantiRuangOpen.value = false;
  gantiRuangTarget.value = null;
};

const handleGantiRuang = async () => {
  if (!gantiRuangTarget.value) return;
  gantiRuangSubmitting.value = true;
  gantiRuangError.value = null;
  try {
    await pendaftarSidangApi.update(gantiRuangTarget.value.id, {
      jadwalSidangId: gantiRuangJadwalSidangId.value ? Number(gantiRuangJadwalSidangId.value) : null,
    });
    toastSuccess('Ruang sidang berhasil diubah');
    closeGantiRuang();
    fetchItems();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal mengubah ruang sidang');
    gantiRuangError.value = message;
    toastError(message);
  } finally {
    gantiRuangSubmitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Pendaftar Sidang" subtitle="Mahasiswa yang terdaftar pada jadwal sidang skripsi/tugas akhir.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <p class="text-label-sm text-on-surface-variant mb-2">Pencarian Berdasarkan Tanggal Sidang</p>
        <div class="flex flex-col md:flex-row gap-3">
          <div class="w-full md:w-56">
            <SelectInput v-model="selectedTanggal" placeholder="-- Tanggal --" :disabled="loadingOptions" :options="tanggalOptions" />
          </div>
          <div class="w-full md:w-56">
            <SelectInput v-model="selectedRuangan" placeholder="-- Ruang --" :disabled="loadingOptions" :options="ruanganOptions" />
          </div>
          <AppButton icon="visibility" @click="handleTampil">Tampil</AppButton>
        </div>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Pendaftar Sidang</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NPM, nama, atau judul..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data pendaftar sidang">
        <template #cell-npm="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-namaJudul="{ item }">
          <p class="font-medium text-on-surface">{{ item.mahasiswa?.namaLengkap?.toUpperCase() ?? '-' }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.judul }}</p>
        </template>
        <template #cell-ganti_ruang="{ item }">
          <button
            v-if="canUpdate"
            type="button"
            class="text-primary hover:underline text-label-sm"
            @click="openGantiRuang(item)"
          >
            {{ item.jadwalSidang?.ruangan ?? 'Belum ada ruang' }}
          </button>
          <span v-else class="text-label-sm text-on-surface-variant">{{ item.jadwalSidang?.ruangan ?? '-' }}</span>
          <p v-if="item.jadwalSidang" class="text-label-sm text-on-surface-variant">
            {{ formatDate(item.jadwalSidang.tanggal) }} &middot; {{ item.jadwalSidang.jam }}
          </p>
        </template>
        <template #cell-pembimbing="{ item }">{{ pembimbingLine(item) }}</template>
        <template #cell-penguji="{ item }">{{ item.jadwalSidang?.dosenPenguji?.namaLengkap ?? '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Pendaftar Sidang' : 'Tambah Pendaftar Sidang'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.mahasiswaId"
          label="Mahasiswa"
          required
          placeholder="Pilih mahasiswa..."
          :options="mahasiswaOptions"
          :error="errors.mahasiswaId"
        />
        <TextareaInput v-model="form.judul" label="Judul Skripsi/Tugas Akhir" required :rows="3" :error="errors.judul" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.pembimbing1Id" label="Pembimbing 1" placeholder="Pilih dosen..." :options="dosenOptions" />
          <SelectInput v-model="form.pembimbing2Id" label="Pembimbing 2" placeholder="Pilih dosen..." :options="dosenOptions" />
        </div>
        <SelectInput
          v-model="form.jadwalSidangId"
          label="Jadwal Sidang"
          placeholder="Belum ditentukan"
          :options="jadwalSidangOptions"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal :model-value="isGantiRuangOpen" title="Ganti Ruang Sidang" @update:model-value="closeGantiRuang">
      <div class="space-y-4">
        <div v-if="gantiRuangError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ gantiRuangError }}
        </div>
        <p class="text-body-sm text-on-surface-variant">
          {{ gantiRuangTarget?.mahasiswa?.nim }} - {{ gantiRuangTarget?.mahasiswa?.namaLengkap }}
        </p>
        <SelectInput
          v-model="gantiRuangJadwalSidangId"
          label="Jadwal Sidang (Tanggal - Jam - Ruang)"
          placeholder="Belum ditentukan"
          :options="jadwalSidangOptions"
        />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeGantiRuang">Batal</AppButton>
        <AppButton :disabled="gantiRuangSubmitting" @click="handleGantiRuang">
          {{ gantiRuangSubmitting ? 'Menyimpan...' : 'Simpan' }}
        </AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pendaftar Sidang"
      :message="`Yakin ingin menghapus pendaftaran sidang ${deleteTarget?.mahasiswa?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
