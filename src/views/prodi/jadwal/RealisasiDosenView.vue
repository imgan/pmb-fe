<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  realisasiDosenApi,
  type RealisasiDosenDetail,
  type RealisasiDosenFilterOptions,
  type RealisasiDosenPertemuan,
  type RealisasiDosenRow,
  type RealisasiDosenSummary,
} from '@/api/realisasiDosen';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

const { tahunAjaranId: sessionTahunAjaranId } = useProdiContext();

type Row = RealisasiDosenRow & { no: number };
type SortKey = keyof Pick<Row, 'no' | 'kelas' | 'kodeMataKuliah' | 'namaMataKuliah' | 'dosen' | 'hadir' | 'persentase'>;

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center', sortable: true },
  { key: 'kelas', label: 'Kelas', sortable: true },
  { key: 'kodeMataKuliah', label: 'Kode MK', sortable: true },
  { key: 'namaMataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'dosen', label: 'Dosen', sortable: true },
  { key: 'jadwal', label: 'Hari / Jam / Ruang' },
  { key: 'hadir', label: 'Hadir', align: 'center', sortable: true },
  { key: 'absen', label: 'Tidak Hadir / Izin / Sakit', align: 'center' },
  { key: 'persentase', label: 'Realisasi', sortable: true },
];

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));

const options = ref<RealisasiDosenFilterOptions>({ tahunAjaran: [], kelas: [], dosen: [] });
const tahunAjaranId = ref<number | ''>('');
const kelas = ref('');
const dosenId = ref<number | ''>('');
const search = ref('');
const pageSize = ref(10);
const page = ref(1);
const sortKey = ref<SortKey>('no');
const sortDir = ref<'asc' | 'desc'>('asc');

const rows = ref<Row[]>([]);
const summary = ref<RealisasiDosenSummary>({ jadwal: 0, hadir: 0, tidakHadir: 0, target: 0 });
const loading = ref(false);
const error = ref<string | null>(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await realisasiDosenApi.list({
      tahunAjaranId: tahunAjaranId.value || undefined,
      kelas: kelas.value || undefined,
      dosenId: dosenId.value || undefined,
    });
    rows.value = result.rows.map((r, i) => ({ ...r, no: i + 1 }));
    summary.value = result.summary;
    page.value = 1;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat realisasi dosen');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    options.value = await realisasiDosenApi.filterOptions();
    // Nilai awal = tahun akademik acuan sesi (bila ada jadwal di tahun tsb).
    if (options.value.tahunAjaran.some((t) => t.id === sessionTahunAjaranId)) tahunAjaranId.value = sessionTahunAjaranId ?? '';
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan filter');
  }
  fetchData();
});

watch([search, pageSize], () => (page.value = 1));

const tahunAjaranOptions = computed(() => options.value.tahunAjaran.map((t) => ({ value: t.id, label: formatTahunAjaran(t) })));
const kelasOptions = computed(() => options.value.kelas.map((k) => ({ value: k, label: k })));
const dosenOptions = computed(() => options.value.dosen.map((d) => ({ value: d.id, label: d.nama })));

const handleSort = (key: string) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else {
    sortKey.value = key as SortKey;
    sortDir.value = 'asc';
  }
};

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = q
    ? rows.value.filter((r) =>
        [r.kelas, r.kodeMataKuliah, r.namaMataKuliah, r.dosen, r.ruangan].some((v) => (v ?? '').toLowerCase().includes(q))
      )
    : [...rows.value];
  const dir = sortDir.value === 'asc' ? 1 : -1;
  const key = sortKey.value;
  return list.sort((a, b) => {
    const va = a[key] ?? '';
    const vb = b[key] ?? '';
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
  });
});

const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
}));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));

const persenTotal = computed(() =>
  summary.value.target ? Math.round((summary.value.hadir / summary.value.target) * 1000) / 10 : 0
);
// Hijau bila sudah >= 75% target, kuning >= 50%, merah di bawahnya.
const progressColor = (p: number) => (p >= 75 ? 'bg-[#059669]' : p >= 50 ? 'bg-[#E0A93B]' : 'bg-error');

// ---- Detail pertemuan ----
const detailOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<RealisasiDosenDetail | null>(null);
const detailError = ref<string | null>(null);

const openDetail = async (row: Row) => {
  detailOpen.value = true;
  detailLoading.value = true;
  detailError.value = null;
  detail.value = null;
  try {
    detail.value = await realisasiDosenApi.detail(row.id);
  } catch (err) {
    detailError.value = extractErrorMessage(err, 'Gagal memuat detail pertemuan');
  } finally {
    detailLoading.value = false;
  }
};

const STATUS_BADGE: Record<RealisasiDosenPertemuan['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  HADIR: { label: 'Hadir', variant: 'success' },
  TIDAK_HADIR: { label: 'Tidak Hadir', variant: 'danger' },
  IZIN: { label: 'Izin', variant: 'warning' },
  SAKIT: { label: 'Sakit', variant: 'neutral' },
};

const formatTanggal = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatJam = (masuk: string | null, keluar: string | null) =>
  masuk || keluar ? `${masuk?.slice(0, 5) ?? '?'} - ${keluar?.slice(0, 5) ?? '?'}` : '-';
</script>

<template>
  <div>
    <PageHeader title="Realisasi Dosen" subtitle="Rekap realisasi kehadiran mengajar dosen per kelas." />

    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <p class="text-label-md text-on-surface-variant">Jadwal Kuliah</p>
        <p class="text-headline-md font-semibold text-on-surface tabular-nums">{{ summary.jadwal }}</p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <p class="text-label-md text-on-surface-variant">Pertemuan Hadir</p>
        <p class="text-headline-md font-semibold text-on-surface tabular-nums">{{ summary.hadir }}</p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <p class="text-label-md text-on-surface-variant">Tidak Hadir / Izin / Sakit</p>
        <p class="text-headline-md font-semibold text-on-surface tabular-nums">{{ summary.tidakHadir }}</p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
        <p class="text-label-md text-on-surface-variant">Realisasi dari Target</p>
        <p class="text-headline-md font-semibold text-on-surface tabular-nums">{{ persenTotal }}%</p>
        <p class="text-label-sm text-on-surface-variant">{{ summary.hadir }} / {{ summary.target }} pertemuan</p>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright grid grid-cols-1 md:grid-cols-4 gap-3 md:items-end">
        <SelectInput v-model="tahunAjaranId" label="Tahun Ajaran" :options="tahunAjaranOptions" placeholder="Semua Tahun Ajaran" />
        <SelectInput v-model="kelas" label="Kelas" :options="kelasOptions" placeholder="Semua Kelas" />
        <SelectInput v-model="dosenId" label="Dosen" :options="dosenOptions" placeholder="Semua Dosen" />
        <div>
          <AppButton icon="search" :disabled="loading" @click="fetchData">Periksa</AppButton>
        </div>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Realisasi Dosen</div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <SearchInput v-model="search" placeholder="Cari kelas, mata kuliah, dosen..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="pageItems"
        :loading="loading"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        actions-align="center"
        empty-message="Belum ada jadwal kuliah"
        @sort="handleSort"
      >
        <template #cell-dosen="{ item }">{{ item.dosen ?? '-' }}</template>
        <template #cell-jadwal="{ item }">
          <span class="whitespace-nowrap">{{ item.hari }}{{ item.jam ? ` / Jam ke-${item.jam}` : '' }}</span>
          <span class="block text-label-sm text-on-surface-variant">{{ item.ruangan ?? '-' }}</span>
        </template>
        <template #cell-hadir="{ item }">
          <span class="font-semibold tabular-nums">{{ item.hadir }}</span>
        </template>
        <template #cell-absen="{ item }">
          <span class="tabular-nums">{{ item.tidakHadir }} / {{ item.izin }} / {{ item.sakit }}</span>
        </template>
        <template #cell-persentase="{ item }">
          <div class="min-w-36">
            <div class="flex justify-between text-label-sm mb-1">
              <span class="tabular-nums">{{ item.hadir }}/{{ item.target }}</span>
              <span class="tabular-nums font-medium">{{ item.persentase }}%</span>
            </div>
            <div class="h-2 rounded-full bg-surface-container">
              <div
                class="h-full rounded-full"
                :class="progressColor(item.persentase)"
                :style="{ width: `${Math.min(100, item.persentase)}%` }"
              ></div>
            </div>
          </div>
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-primary hover:text-primary/80 transition-colors"
            title="Lihat riwayat pertemuan"
            @click="openDetail(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-if="!loading && filtered.length" v-model="page" :meta="meta" />
    </section>

    <Modal
      v-model="detailOpen"
      size="lg"
      title="Riwayat Pertemuan"
      :subtitle="detail ? `${detail.jadwal.kelas} · ${detail.jadwal.kodeMataKuliah} ${detail.jadwal.namaMataKuliah} · ${detail.jadwal.dosen ?? '-'}` : undefined"
    >
      <div v-if="detailLoading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else-if="detailError" class="p-3 rounded-md text-body-sm text-error bg-error-container">{{ detailError }}</div>
      <p v-else-if="!detail?.pertemuan.length" class="py-8 text-center text-body-sm text-on-surface-variant">
        Belum ada realisasi pertemuan untuk jadwal ini.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 text-center">Ke</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Jam</th>
              <th class="p-3">Status</th>
              <th class="p-3">Materi / Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-on-surface">
            <tr v-for="(p, i) in detail.pertemuan" :key="p.id">
              <td class="p-3 text-center tabular-nums">{{ p.pertemuanKe ?? i + 1 }}</td>
              <td class="p-3 whitespace-nowrap">{{ formatTanggal(p.tanggal) }}</td>
              <td class="p-3 whitespace-nowrap tabular-nums">{{ formatJam(p.jamMasuk, p.jamKeluar) }}</td>
              <td class="p-3"><StatusBadge v-bind="STATUS_BADGE[p.status]" /></td>
              <td class="p-3">
                {{ p.uraian || '-' }}
                <span v-if="p.keterangan" class="block text-label-sm text-on-surface-variant">{{ p.keterangan }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  </div>
</template>
