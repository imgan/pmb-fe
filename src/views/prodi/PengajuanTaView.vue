<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import {
  pengajuanTaApi,
  namaDosenRingkas,
  STATUS_PENGAJUAN_TA_LABEL,
  STATUS_PENGAJUAN_TA_VARIANT,
  type PengajuanTa,
  type StatusPengajuanTa,
} from '@/api/pengajuanTa';
import { jurusanApi } from '@/api/jurusan';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/** Verifikasi pendaftaran judul TA/Skripsi mahasiswa: setujui / tolak, boleh sambil merapikan judul & pembimbing. */
const { canUpdate } = usePermission(MENU.PRODI_PENGAJUAN_TA_MANAGEMENT);

const items = ref<PengajuanTa[]>([]);
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const limit = ref(10);
const search = ref('');
const statusFilter = ref<number | string | null>('DIAJUKAN');
const jurusanFilter = ref<number | string | null>('');
const periodeFilter = ref<number | string | null>('');
const loading = ref(false);
const error = ref<string | null>(null);
const prodiOptions = ref<{ value: number; label: string }[]>([]);
const periodeOptions = ref<{ value: number; label: string }[]>([]);
const dosenOptions = ref<{ value: number; label: string }[]>([]);

const STATUS_OPTIONS = (Object.keys(STATUS_PENGAJUAN_TA_LABEL) as StatusPengajuanTa[]).map((s) => ({ value: s, label: STATUS_PENGAJUAN_TA_LABEL[s] }));

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await pengajuanTaApi.list({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      status: statusFilter.value ? String(statusFilter.value) : undefined,
      jurusanId: jurusanFilter.value ? Number(jurusanFilter.value) : undefined,
      periodeId: periodeFilter.value ? Number(periodeFilter.value) : undefined,
    });
    items.value = res.data;
    meta.value = res.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pengajuan');
  } finally {
    loading.value = false;
  }
};
watch([search, statusFilter, jurusanFilter, periodeFilter, limit], () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
watch(page, fetchItems);

onMounted(async () => {
  fetchItems();
  const [prodi, periode, dosen] = await Promise.allSettled([
    jurusanApi.listProdi({ limit: 100 }),
    pengajuanTaApi.listPeriode({ limit: 100 }),
    dosenApi.list({ limit: 500 }),
  ]);
  if (prodi.status === 'fulfilled') prodiOptions.value = prodi.value.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  if (periode.status === 'fulfilled') {
    periodeOptions.value = periode.value.data.map((p) => ({
      value: p.id,
      label: `${formatDate(p.tanggalMulai)} s/d ${formatDate(p.tanggalSelesai)}${p.jurusan ? ` · ${p.jurusan.namaJurusan}` : ''}`,
    }));
  }
  if (dosen.status === 'fulfilled') {
    dosenOptions.value = dosen.value.data
      .map((d) => ({ value: d.id, label: [d.namaLengkap, d.gelar].filter(Boolean).join(', ') }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
});

const columns: DataTableColumn[] = [
  { key: 'mahasiswa', label: 'Mahasiswa' },
  { key: 'judul', label: 'Judul' },
  { key: 'tempatKkp', label: 'KKP/Observasi' },
  { key: 'pembimbing', label: 'Pembimbing' },
  { key: 'createdAt', label: 'Diajukan' },
  { key: 'status', label: 'Status', align: 'center' },
];

// ---- Verifikasi ----
const target = ref<PengajuanTa | null>(null);
const form = reactive({
  status: 'DISETUJUI' as number | string | null,
  judul: '',
  pembimbingUtamaId: null as number | string | null,
  pembimbingPendampingId: null as number | string | null,
  catatanProdi: '',
});
const formError = ref<string | null>(null);
const saving = ref(false);

const openVerifikasi = (p: PengajuanTa) => {
  target.value = p;
  form.status = p.status === 'DIAJUKAN' ? 'DISETUJUI' : p.status;
  form.judul = p.judul;
  form.pembimbingUtamaId = p.pembimbingUtamaId;
  form.pembimbingPendampingId = p.pembimbingPendampingId;
  form.catatanProdi = p.catatanProdi ?? '';
  formError.value = null;
};

const simpan = async () => {
  if (!target.value) return;
  formError.value = null;
  if (form.status === 'DITOLAK' && !form.catatanProdi.trim()) {
    formError.value = 'Isi alasan penolakan';
    return;
  }
  if (form.pembimbingUtamaId && form.pembimbingUtamaId === form.pembimbingPendampingId) {
    formError.value = 'Pembimbing utama dan pendamping tidak boleh sama';
    return;
  }
  saving.value = true;
  try {
    await pengajuanTaApi.verifikasi(target.value.id, {
      status: form.status as StatusPengajuanTa,
      catatanProdi: form.catatanProdi.trim() || null,
      judul: form.judul.trim(),
      pembimbingUtamaId: form.pembimbingUtamaId ? Number(form.pembimbingUtamaId) : null,
      pembimbingPendampingId: form.pembimbingPendampingId ? Number(form.pembimbingPendampingId) : null,
    });
    toastSuccess('Pengajuan diverifikasi');
    target.value = null;
    await fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan verifikasi');
  } finally {
    saving.value = false;
  }
};

const textareaClass =
  'w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary';
</script>

<template>
  <div>
    <PageHeader title="Pengajuan TA/Skripsi" subtitle="Verifikasi pendaftaran judul Tugas Akhir/Skripsi dari portal mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-4 gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM, nama, judul..." />
        <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="STATUS_OPTIONS" />
        <SelectInput v-model="jurusanFilter" placeholder="Semua Prodi" :options="prodiOptions" />
        <SelectInput v-model="periodeFilter" placeholder="Semua Periode" :options="periodeOptions" />
      </div>
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>
      <DataTable :columns="columns" :items="items" :loading="loading" empty-message="Belum ada pengajuan.">
        <template #cell-mahasiswa="{ item }">
          <span class="block text-on-surface font-medium">{{ item.mahasiswa?.namaLengkap ?? '-' }}</span>
          <span class="block text-label-sm text-on-surface-variant">{{ item.mahasiswa?.nim }} · {{ item.mahasiswa?.jurusan?.namaJurusan ?? '-' }}</span>
          <span v-if="item.noTelepon || item.email" class="block text-label-sm text-on-surface-variant">{{ [item.noTelepon, item.email].filter(Boolean).join(' / ') }}</span>
        </template>
        <template #cell-judul="{ item }"><span class="block min-w-56">{{ item.judul }}</span></template>
        <template #cell-tempatKkp="{ item }">{{ item.tempatKkp || '-' }}</template>
        <template #cell-pembimbing="{ item }">
          <span class="block min-w-44">1. {{ namaDosenRingkas(item.pembimbingUtama) }}</span>
          <span v-if="item.pembimbingPendamping" class="block">2. {{ namaDosenRingkas(item.pembimbingPendamping) }}</span>
        </template>
        <template #cell-createdAt="{ item }"><span class="whitespace-nowrap">{{ formatDate(item.createdAt) }}</span></template>
        <template #cell-status="{ item }">
          <StatusBadge :label="STATUS_PENGAJUAN_TA_LABEL[item.status as StatusPengajuanTa]" :variant="STATUS_PENGAJUAN_TA_VARIANT[item.status as StatusPengajuanTa]" />
          <span v-if="item.verifikator" class="block mt-1 text-label-sm text-on-surface-variant">oleh {{ item.verifikator.name }}</span>
        </template>
        <template #actions="{ item }">
          <button v-if="canUpdate" type="button" class="text-label-md text-primary hover:underline whitespace-nowrap" @click="openVerifikasi(item)">
            Verifikasi
          </button>
        </template>
      </DataTable>
      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="!!target"
      title="Verifikasi Pengajuan TA/Skripsi"
      :subtitle="target ? `${target.mahasiswa?.nim ?? ''} — ${target.mahasiswa?.namaLengkap ?? ''}` : ''"
      size="lg"
      @update:model-value="(v: boolean) => { if (!v) target = null; }"
    >
      <form v-if="target" class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Judul</span>
          <textarea v-model="form.judul" rows="3" maxlength="1000" :class="textareaClass"></textarea>
        </label>
        <p class="text-body-sm text-on-surface-variant">KKP / Observasi di: {{ target.tempatKkp || '-' }}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.pembimbingUtamaId" label="Pembimbing Utama" placeholder="---" :options="dosenOptions" />
          <SelectInput v-model="form.pembimbingPendampingId" label="Pembimbing Pendamping" placeholder="---" :options="dosenOptions" />
        </div>
        <SelectInput v-model="form.status" label="Status" :clearable="false" :options="STATUS_OPTIONS" />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Catatan / Alasan</span>
          <textarea v-model="form.catatanProdi" rows="3" maxlength="2000" :class="textareaClass"></textarea>
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="target = null">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
