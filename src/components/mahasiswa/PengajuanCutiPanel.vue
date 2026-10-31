<script setup lang="ts">
import { ref, watch } from 'vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { pengajuanCutiApi, type PengajuanCutiProdi } from '@/api/pengajuanCuti';
import type { StatusPengajuanCuti } from '@/api/mahasiswaPortal';
import type { PagingMeta } from '@/types/common';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastSuccess } from '@/utils/swal';

/**
 * Pengajuan cuti dari portal mahasiswa (Pengajuan → Cuti). Disetujui → mahasiswa otomatis masuk
 * daftar Master Cuti (statusKeluar = CUTI); ditolak → wajib alasan, tampil di portal mahasiswa.
 */
const props = defineProps<{ canUpdate: boolean }>();
const emit = defineEmits<{ approved: [] }>();

const STATUS_LABEL: Record<StatusPengajuanCuti, string> = { DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };
const STATUS_VARIANT: Record<StatusPengajuanCuti, 'warning' | 'success' | 'danger'> = {
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};
const statusOptions = [
  { value: 'DIAJUKAN', label: 'Menunggu Persetujuan' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
];

const columns: DataTableColumn[] = [
  { key: 'mahasiswa', label: 'Mahasiswa' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'periode', label: 'Periode Cuti' },
  { key: 'tanggalAjuan', label: 'Tanggal Ajuan' },
  { key: 'alasan', label: 'Alasan' },
  { key: 'status', label: 'Status', align: 'center' },
];

const items = ref<PengajuanCutiProdi[]>([]);
const meta = ref<PagingMeta | null>(null);
const page = ref(1);
const search = ref('');
const status = ref<StatusPengajuanCuti | ''>('DIAJUKAN');
const loading = ref(false);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await pengajuanCutiApi.list({ page: page.value, limit: 10, search: search.value || undefined, status: status.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pengajuan cuti');
  } finally {
    loading.value = false;
  }
};
fetchItems();
watch(page, fetchItems);
watch([search, status], () => {
  if (page.value === 1) fetchItems();
  else page.value = 1;
});

const cetak = async (id: number) => {
  try {
    openBlob(await pengajuanCutiApi.cetakPdf(id));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mencetak formulir cuti');
  }
};

// ---- Verifikasi ----
const target = ref<PengajuanCutiProdi | null>(null);
const keputusan = ref<'DISETUJUI' | 'DITOLAK'>('DISETUJUI');
const catatan = ref('');
const verifError = ref<string | null>(null);
const submitting = ref(false);

const openVerifikasi = (item: PengajuanCutiProdi, value: 'DISETUJUI' | 'DITOLAK') => {
  target.value = item;
  keputusan.value = value;
  catatan.value = '';
  verifError.value = null;
};

const submitVerifikasi = async () => {
  if (!target.value) return;
  if (keputusan.value === 'DITOLAK' && !catatan.value.trim()) return (verifError.value = 'Isi alasan penolakan');
  submitting.value = true;
  verifError.value = null;
  try {
    await pengajuanCutiApi.verifikasi(target.value.id, { status: keputusan.value, catatanProdi: catatan.value.trim() || null });
    toastSuccess(keputusan.value === 'DISETUJUI' ? 'Pengajuan cuti disetujui' : 'Pengajuan cuti ditolak');
    if (keputusan.value === 'DISETUJUI') emit('approved');
    target.value = null;
    fetchItems();
  } catch (err) {
    verifError.value = extractErrorMessage(err, 'Gagal memverifikasi pengajuan cuti');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-6">
    <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Pengajuan Cuti dari Mahasiswa</div>

    <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:justify-between gap-3">
      <div class="w-full md:w-56">
        <SelectInput v-model="status" placeholder="Semua status" :options="statusOptions" />
      </div>
      <div class="w-full md:w-64">
        <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
      </div>
    </div>

    <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

    <DataTable :columns="columns" :items="items" :loading="loading" empty-message="Tidak ada pengajuan cuti">
      <template #cell-mahasiswa="{ item }">
        <div class="font-medium">{{ item.mahasiswa.namaLengkap }}</div>
        <div class="text-label-sm text-on-surface-variant">{{ item.mahasiswa.nim }} &middot; {{ item.mahasiswa.prodi }}</div>
      </template>
      <template #cell-periode="{ item }">
        <span class="whitespace-nowrap">{{ formatDate(item.tanggalAwal) }} – {{ formatDate(item.tanggalAkhir) }}</span>
      </template>
      <template #cell-tanggalAjuan="{ item }">{{ formatDate(item.tanggalAjuan) }}</template>
      <template #cell-alasan="{ item }">
        <div class="whitespace-pre-line">{{ item.alasan }}</div>
        <div v-if="item.catatanProdi" class="mt-1 text-label-sm text-on-surface-variant">Catatan: {{ item.catatanProdi }}</div>
      </template>
      <template #cell-status="{ item }">
        <StatusBadge :label="STATUS_LABEL[item.status as StatusPengajuanCuti]" :variant="STATUS_VARIANT[item.status as StatusPengajuanCuti]" />
      </template>
      <template #actions="{ item }">
        <div class="flex justify-end gap-2">
          <AppButton variant="ghost" icon="print" @click="cetak(item.id)">Cetak</AppButton>
          <template v-if="props.canUpdate && item.status === 'DIAJUKAN'">
            <AppButton icon="check" @click="openVerifikasi(item, 'DISETUJUI')">Setujui</AppButton>
            <AppButton variant="danger" icon="close" @click="openVerifikasi(item, 'DITOLAK')">Tolak</AppButton>
          </template>
        </div>
      </template>
    </DataTable>

    <Pagination v-if="meta" v-model="page" :meta="meta" />

    <Modal
      :model-value="!!target"
      :title="keputusan === 'DISETUJUI' ? 'Setujui Pengajuan Cuti' : 'Tolak Pengajuan Cuti'"
      size="md"
      @update:model-value="target = null"
    >
      <div v-if="target" class="space-y-4">
        <div v-if="verifError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ verifError }}</div>
        <p class="text-body-sm text-on-surface">
          {{ target.mahasiswa.nim }} - {{ target.mahasiswa.namaLengkap }}, semester {{ target.semester }}, cuti
          {{ formatDate(target.tanggalAwal) }} s/d {{ formatDate(target.tanggalAkhir) }}.
        </p>
        <p v-if="keputusan === 'DISETUJUI'" class="text-body-sm text-on-surface-variant">
          Mahasiswa akan berstatus cuti dan masuk ke daftar Master Cuti.
        </p>
        <TextareaInput
          v-model="catatan"
          :label="keputusan === 'DITOLAK' ? 'Alasan Penolakan' : 'Catatan (opsional)'"
          :required="keputusan === 'DITOLAK'"
          :rows="3"
        />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="target = null">Batal</AppButton>
        <AppButton :variant="keputusan === 'DITOLAK' ? 'danger' : 'primary'" :disabled="submitting" @click="submitVerifikasi">
          {{ submitting ? 'Menyimpan...' : keputusan === 'DISETUJUI' ? 'Setujui' : 'Tolak' }}
        </AppButton>
      </template>
    </Modal>
  </section>
</template>
