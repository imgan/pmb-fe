<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import { pengajuanTaApi, type PeriodePengajuanTa } from '@/api/pengajuanTa';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/** Prodi membuka periode pendaftaran judul TA/Skripsi; mahasiswa hanya bisa mengajukan di dalam periode ini. */
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_PERIODE_PENGAJUAN_TA_MANAGEMENT);

const items = ref<PeriodePengajuanTa[]>([]);
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const limit = ref(10);
const jurusanFilter = ref<number | string | null>('');
const loading = ref(false);
const error = ref<string | null>(null);
const prodiOptions = ref<{ value: number; label: string }[]>([]);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await pengajuanTaApi.listPeriode({ page: page.value, limit: limit.value, jurusanId: jurusanFilter.value ? Number(jurusanFilter.value) : undefined });
    items.value = res.data;
    meta.value = res.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat periode');
  } finally {
    loading.value = false;
  }
};
watch([jurusanFilter, limit], () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
watch(page, fetchItems);

onMounted(async () => {
  fetchItems();
  try {
    const res = await jurusanApi.listProdi({ limit: 100 });
    prodiOptions.value = res.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  } catch {
    prodiOptions.value = [];
  }
});

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const statusPeriode = (p: PeriodePengajuanTa): { label: string; variant: 'success' | 'warning' | 'neutral' } => {
  const today = hariIni();
  if (!p.isActive) return { label: 'Nonaktif', variant: 'neutral' };
  if (p.tanggalMulai > today) return { label: 'Akan Dibuka', variant: 'warning' };
  if (p.tanggalSelesai < today) return { label: 'Ditutup', variant: 'neutral' };
  return { label: 'Dibuka', variant: 'success' };
};

const columns: DataTableColumn[] = [
  { key: 'periode', label: 'Periode' },
  { key: 'prodi', label: 'Prodi' },
  { key: 'jumlahPengajuan', label: 'Pengajuan', align: 'center' },
  { key: 'keterangan', label: 'Keterangan' },
  { key: 'status', label: 'Status', align: 'center' },
];

// ---- Form ----
const formOpen = ref(false);
const editing = ref<PeriodePengajuanTa | null>(null);
const form = reactive({ jurusanId: null as number | string | null, tanggalMulai: '', tanggalSelesai: '', keterangan: '', isActive: true });
const formError = ref<string | null>(null);
const saving = ref(false);

const openForm = (item: PeriodePengajuanTa | null) => {
  editing.value = item;
  form.jurusanId = item?.jurusanId ?? null;
  form.tanggalMulai = item?.tanggalMulai ?? '';
  form.tanggalSelesai = item?.tanggalSelesai ?? '';
  form.keterangan = item?.keterangan ?? '';
  form.isActive = item?.isActive ?? true;
  formError.value = null;
  formOpen.value = true;
};

const simpan = async () => {
  formError.value = null;
  if (!form.tanggalMulai || !form.tanggalSelesai) {
    formError.value = 'Tanggal mulai dan selesai wajib diisi';
    return;
  }
  if (form.tanggalSelesai < form.tanggalMulai) {
    formError.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
    return;
  }
  const payload = {
    jurusanId: form.jurusanId ? Number(form.jurusanId) : null,
    tanggalMulai: form.tanggalMulai,
    tanggalSelesai: form.tanggalSelesai,
    keterangan: form.keterangan.trim() || null,
    isActive: form.isActive,
  };
  saving.value = true;
  try {
    if (editing.value) await pengajuanTaApi.updatePeriode(editing.value.id, payload);
    else await pengajuanTaApi.createPeriode(payload);
    toastSuccess('Periode disimpan');
    formOpen.value = false;
    await fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan periode');
  } finally {
    saving.value = false;
  }
};

const deleteTarget = ref<PeriodePengajuanTa | null>(null);
const deleting = ref(false);
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await pengajuanTaApi.removePeriode(deleteTarget.value.id);
    toastSuccess('Periode dihapus');
    deleteTarget.value = null;
    await fetchItems();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menghapus periode');
    deleteTarget.value = null;
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Periode Pengajuan TA/Skripsi" subtitle="Atur kapan mahasiswa bisa mendaftarkan judul Tugas Akhir/Skripsi.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openForm(null)">Buka Periode</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <div class="w-full md:w-72">
          <SelectInput v-model="jurusanFilter" placeholder="Semua Prodi" :options="prodiOptions" />
        </div>
      </div>
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>
      <DataTable :columns="columns" :items="items" :loading="loading" empty-message="Belum ada periode pengajuan.">
        <template #cell-periode="{ item }">
          <span class="whitespace-nowrap font-medium text-on-surface">{{ formatDate(item.tanggalMulai) }} s/d {{ formatDate(item.tanggalSelesai) }}</span>
        </template>
        <template #cell-prodi="{ item }">{{ item.jurusan?.namaJurusan ?? 'Semua prodi' }}</template>
        <template #cell-jumlahPengajuan="{ item }">{{ item.jumlahPengajuan ?? 0 }}</template>
        <template #cell-keterangan="{ item }"><span class="block max-w-xs truncate" :title="item.keterangan ?? ''">{{ item.keterangan || '-' }}</span></template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusPeriode(item).label" :variant="statusPeriode(item).variant" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openForm(item)" @delete="deleteTarget = item" />
        </template>
      </DataTable>
      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="formOpen" :title="editing ? 'Ubah Periode' : 'Buka Periode Pengajuan'" @update:model-value="(v: boolean) => (formOpen = v)">
      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <SelectInput v-model="form.jurusanId" label="Prodi" placeholder="Semua prodi" :options="prodiOptions" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalMulai" label="Tanggal Mulai" required />
          <DateInput v-model="form.tanggalSelesai" label="Tanggal Selesai" required />
        </div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Keterangan untuk mahasiswa</span>
          <textarea
            v-model="form.keterangan"
            rows="3"
            maxlength="2000"
            placeholder="Contoh: Bank BRI : 0419-01-000694-30-1 a.n. ... / Kasir : +62 811-8209-944"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          ></textarea>
        </label>
        <CheckboxToggle v-model="form.isActive" label="Aktif" description="Nonaktifkan untuk menutup periode lebih awal." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Periode"
      message="Hapus periode ini? Periode yang sudah memiliki pengajuan tidak bisa dihapus (nonaktifkan saja)."
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
