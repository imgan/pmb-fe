<script setup lang="ts">
import { ref, watch } from 'vue';
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
  simTiketMahasiswaApi,
  JENIS_KEBUTUHAN_LABEL,
  STATUS_TIKET_LABEL,
  STATUS_TIKET_VARIANT,
  type StatusTiket,
  type TiketMahasiswa,
} from '@/api/tiketMahasiswa';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDateTime } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/** Modul SIM: memproses tiket bantuan dari portal mahasiswa (status + tanggapan; petugas tercatat otomatis). */
const { canUpdate } = usePermission(MENU.SIM_TIKET_MAHASISWA_MANAGEMENT);

const items = ref<TiketMahasiswa[]>([]);
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const ringkasan = ref<Partial<Record<StatusTiket, number>>>({});
const page = ref(1);
const limit = ref(10);
const search = ref('');
const statusFilter = ref<string | number | null>('');
const jenisFilter = ref<string | number | null>('');
const loading = ref(false);
const error = ref<string | null>(null);

const STATUS_OPTIONS = (Object.keys(STATUS_TIKET_LABEL) as StatusTiket[]).map((s) => ({ value: s, label: STATUS_TIKET_LABEL[s] }));
const JENIS_OPTIONS = Object.entries(JENIS_KEBUTUHAN_LABEL).map(([value, label]) => ({ value, label }));

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await simTiketMahasiswaApi.list({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      status: statusFilter.value ? String(statusFilter.value) : undefined,
      jenisKebutuhan: jenisFilter.value ? String(jenisFilter.value) : undefined,
    });
    items.value = res.data;
    meta.value = res.meta;
    ringkasan.value = res.ringkasan;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat tiket');
  } finally {
    loading.value = false;
  }
};

watch([search, statusFilter, jenisFilter, limit], () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});
watch(page, fetchItems);
fetchItems();

const columns: DataTableColumn[] = [
  { key: 'nomorTiket', label: 'No Tiket' },
  { key: 'pelapor', label: 'Pelapor' },
  { key: 'createdAt', label: 'Tanggal' },
  { key: 'jenisKebutuhan', label: 'Jenis Keluhan' },
  { key: 'uraian', label: 'Uraian' },
  { key: 'tanggapan', label: 'Tanggapan' },
  { key: 'petugas', label: 'Petugas' },
  { key: 'status', label: 'Status', align: 'center' },
];

// ---- Tanggapi ----
const target = ref<TiketMahasiswa | null>(null);
const formStatus = ref<string | number | null>('DIPROSES');
const formTanggapan = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);

const openTanggapi = (t: TiketMahasiswa) => {
  target.value = t;
  formStatus.value = t.status === 'BARU' ? 'DIPROSES' : t.status;
  formTanggapan.value = t.tanggapan ?? '';
  formError.value = null;
};

const simpan = async () => {
  if (!target.value) return;
  formError.value = null;
  if (formStatus.value === 'DITOLAK' && !formTanggapan.value.trim()) {
    formError.value = 'Isi alasan penolakan tiket';
    return;
  }
  saving.value = true;
  try {
    await simTiketMahasiswaApi.tanggapi(target.value.id, { status: formStatus.value as StatusTiket, tanggapan: formTanggapan.value.trim() || null });
    toastSuccess('Tiket ditanggapi');
    target.value = null;
    await fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan tanggapan');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Tiket Mahasiswa" subtitle="Pengajuan bantuan dari portal mahasiswa: perangkat, jaringan, sistem informasi, dan data." />

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <button
        v-for="s in STATUS_OPTIONS"
        :key="s.value"
        type="button"
        class="text-left bg-surface-container-lowest border rounded-lg p-4 transition-colors"
        :class="statusFilter === s.value ? 'border-primary' : 'border-outline-variant hover:border-primary'"
        @click="statusFilter = statusFilter === s.value ? '' : s.value"
      >
        <p class="text-label-md text-on-surface-variant">{{ s.label }}</p>
        <p class="text-headline-md font-semibold text-on-surface">{{ ringkasan[s.value] ?? 0 }}</p>
      </button>
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari no tiket, NIM, nama, atau uraian..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="STATUS_OPTIONS" />
        </div>
        <div class="w-full md:w-60">
          <SelectInput v-model="jenisFilter" placeholder="Semua Jenis" :options="JENIS_OPTIONS" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" empty-message="Belum ada tiket.">
        <template #cell-nomorTiket="{ item }"><span class="whitespace-nowrap font-medium">{{ item.nomorTiket ?? item.id }}</span></template>
        <template #cell-pelapor="{ item }">
          <span class="block text-on-surface">{{ item.mahasiswa?.namaLengkap ?? '-' }}</span>
          <span class="block text-label-sm text-on-surface-variant">{{ item.mahasiswa?.nim }} · {{ item.mahasiswa?.jurusan?.namaJurusan ?? '-' }}</span>
        </template>
        <template #cell-createdAt="{ item }"><span class="whitespace-nowrap">{{ formatDateTime(item.createdAt) }}</span></template>
        <template #cell-jenisKebutuhan="{ item }"><span class="whitespace-nowrap">{{ JENIS_KEBUTUHAN_LABEL[item.jenisKebutuhan] }}</span></template>
        <template #cell-uraian="{ item }"><span class="block min-w-48 whitespace-pre-line">{{ item.uraian }}</span></template>
        <template #cell-tanggapan="{ item }"><span class="block min-w-40 whitespace-pre-line">{{ item.tanggapan || '-' }}</span></template>
        <template #cell-petugas="{ item }">{{ item.petugas?.name ?? '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="STATUS_TIKET_LABEL[item.status as StatusTiket]" :variant="STATUS_TIKET_VARIANT[item.status as StatusTiket]" />
        </template>
        <template #actions="{ item }">
          <button v-if="canUpdate" type="button" class="text-label-md text-primary hover:underline whitespace-nowrap" @click="openTanggapi(item)">
            Tanggapi
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="!!target"
      title="Tanggapi Tiket"
      :subtitle="target ? `${target.nomorTiket ?? ''} — ${target.mahasiswa?.nim ?? ''} ${target.mahasiswa?.namaLengkap ?? ''}` : ''"
      @update:model-value="(v: boolean) => { if (!v) target = null; }"
    >
      <form v-if="target" class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <div class="rounded-md bg-surface-container p-3 text-body-sm">
          <p class="font-medium text-on-surface">{{ JENIS_KEBUTUHAN_LABEL[target.jenisKebutuhan] }}</p>
          <p class="mt-1 whitespace-pre-line text-on-surface-variant">{{ target.uraian }}</p>
        </div>
        <SelectInput v-model="formStatus" label="Status" :clearable="false" :options="STATUS_OPTIONS" />
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggapan / Alasan</span>
          <textarea
            v-model="formTanggapan"
            rows="4"
            maxlength="2000"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          ></textarea>
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="target = null">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
