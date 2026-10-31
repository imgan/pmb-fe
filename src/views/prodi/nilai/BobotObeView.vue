<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import BobotObeFormModal from '@/components/BobotObeFormModal.vue';
import { prodiBobotObeApi, KOMPONEN_OBE, type BobotObePayload, type BobotObeProdiRow } from '@/api/bobotObe';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Bobot OBE per jadwal kuliah. Diisi dosen pengampu sebelum input nilai; prodi dapat mengubah
 * (nilai yang sudah ada dihitung ulang) atau menghapus (dosen wajib mengisi ulang).
 */
const { tahunAjaranId: sessionTahunAjaranId } = useProdiContext();
const { canUpdate, canDelete } = usePermission(MENU.PRODI_BOBOT_OBE_MANAGEMENT);

const columns: DataTableColumn[] = [
  { key: 'kelas', label: 'Kelas' },
  { key: 'mataKuliah', label: 'Mata Kuliah' },
  { key: 'dosen', label: 'Dosen' },
  ...KOMPONEN_OBE.map(({ key, label }) => ({ key, label: `${label} (%)`, align: 'center' as const })),
  { key: 'total', label: 'Total', align: 'center' },
  { key: 'diubah', label: 'Terakhir Diubah' },
];

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const statusOptions = [
  { value: 'TERISI', label: 'Sudah diisi' },
  { value: 'BELUM', label: 'Belum diisi' },
];

const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranId = ref<number | ''>('');
const status = ref('');
const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const items = ref<BobotObeProdiRow[]>([]);
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const loading = ref(false);
const error = ref<string | null>(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await prodiBobotObeApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value.trim() || undefined,
      tahunAjaranId: tahunAjaranId.value || undefined,
      status: status.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat Bobot OBE');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const ta = await tahunAjaranApi.list({ limit: 100 });
    tahunAjaranOptions.value = ta.data.map((t) => ({ value: t.id, label: formatTahunAjaran(t) }));
    if (ta.data.some((t) => t.id === sessionTahunAjaranId)) tahunAjaranId.value = sessionTahunAjaranId ?? '';
  } catch {
    // filter tahun ajaran opsional
  }
  fetchData();
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    fetchData();
  }, 400);
});
watch([tahunAjaranId, status, pageSize], () => {
  page.value = 1;
  fetchData();
});
watch(page, fetchData);

// ---- Ubah ----
const formOpen = ref(false);
const editing = ref<BobotObeProdiRow | null>(null);
const openEdit = (row: BobotObeProdiRow) => {
  editing.value = row;
  formOpen.value = true;
};
const simpan = async (payload: BobotObePayload) => {
  if (!editing.value) return;
  const res = await prodiBobotObeApi.save(editing.value.id, payload);
  toastSuccess(res.message);
  await fetchData();
};

// ---- Hapus ----
const deleting = ref<BobotObeProdiRow | null>(null);
const deleteLoading = ref(false);
const confirmDelete = async () => {
  if (!deleting.value) return;
  deleteLoading.value = true;
  try {
    await prodiBobotObeApi.remove(deleting.value.id);
    toastSuccess('Bobot OBE dihapus');
    deleting.value = null;
    await fetchData();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menghapus Bobot OBE');
    deleting.value = null;
  } finally {
    deleteLoading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Bobot OBE"
      subtitle="Bobot penilaian Outcome-Based Education per kelas. Diisi dosen pengampu sebelum input nilai; prodi dapat mengubah atau menghapus."
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright grid grid-cols-1 md:grid-cols-3 gap-3 md:items-end">
        <SelectInput v-model="tahunAjaranId" label="Tahun Ajaran" :options="tahunAjaranOptions" placeholder="Semua Tahun Ajaran" />
        <SelectInput v-model="status" label="Status" :options="statusOptions" placeholder="Semua Status" />
        <SearchInput v-model="search" placeholder="Cari kelas, kode / nama mata kuliah..." />
      </div>

      <div class="p-4 border-b border-outline-variant flex items-center gap-2 text-body-sm text-on-surface-variant">
        <span>Show</span>
        <div class="w-20">
          <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
        </div>
        <span>entries</span>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" actions-align="center" empty-message="Belum ada jadwal kuliah">
        <template #cell-mataKuliah="{ item }">
          <span class="font-medium">{{ item.kodeMataKuliah }}</span> · {{ item.namaMataKuliah }}
          <span class="block text-label-sm text-on-surface-variant">{{ item.sks ?? '-' }} SKS · {{ item.tahunAjaran ?? '-' }}</span>
        </template>
        <template #cell-dosen="{ item }">{{ item.dosen ?? '-' }}</template>
        <template v-for="k in KOMPONEN_OBE" :key="k.key" #[`cell-${k.key}`]="{ item }">
          <span class="tabular-nums" :class="item.bobot && !item.bobot[k.key] ? 'text-on-surface-variant' : ''">
            {{ item.bobot ? item.bobot[k.key] : '-' }}
          </span>
        </template>
        <template #cell-total="{ item }">
          <StatusBadge v-if="item.bobot" variant="success" :label="`${item.bobot.total}%`" />
          <StatusBadge v-else variant="warning" label="Belum diisi" />
        </template>
        <template #cell-diubah="{ item }">
          <template v-if="item.bobot">
            <span class="whitespace-nowrap">{{ formatDate(item.bobot.updatedAt) }}</span>
            <span class="block text-label-sm text-on-surface-variant">{{ item.bobot.diubahOleh ?? '-' }}</span>
          </template>
          <span v-else>-</span>
        </template>
        <template #actions="{ item }">
          <div class="flex items-center justify-center gap-2">
            <button
              v-if="canUpdate"
              type="button"
              class="text-primary hover:text-primary/80 transition-colors"
              :title="item.bobot ? 'Ubah Bobot OBE' : 'Isi Bobot OBE'"
              @click="openEdit(item)"
            >
              <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
            </button>
            <button
              v-if="canDelete && item.bobot"
              type="button"
              class="text-error hover:text-error/80 transition-colors"
              title="Hapus Bobot OBE"
              @click="deleting = item"
            >
              <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
            </button>
          </div>
        </template>
      </DataTable>

      <Pagination v-if="!loading && meta.total" v-model="page" :meta="meta" />
    </section>

    <BobotObeFormModal
      v-model="formOpen"
      :bobot="editing?.bobot ?? null"
      :subtitle="editing ? `${editing.kodeMataKuliah} · ${editing.namaMataKuliah} · Kelas ${editing.kelas}` : ''"
      :save="simpan"
    />
    <ConfirmDialog
      :open="!!deleting"
      title="Hapus Bobot OBE"
      :message="`Hapus Bobot OBE kelas ${deleting?.kelas ?? ''} (${deleting?.namaMataKuliah ?? ''})? Dosen wajib mengisi ulang sebelum dapat menyimpan nilai.`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>
