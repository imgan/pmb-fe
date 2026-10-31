<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { authApi } from '@/api/auth';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import type { HariKuliah, JadwalKuliah } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

/**
 * Master Monitoring jadwal kuliah: BAAK (semua prodi) & Prodi → Jadwal Kuliah → Monitoring Jadwal
 * (`modul="prodi"`: filter prodi dikunci ke prodi sesi bila sudah dipilih saat login).
 */
const props = withDefaults(defineProps<{ modul?: 'baak' | 'prodi' }>(), { modul: 'baak' });
const { prodi: prodiSesi, prodiLocked, tahunAjaranId: tahunAjaranSesi } = useProdiContext();
const prodiTerkunci = computed(() => props.modul === 'prodi' && prodiLocked.value);

const router = useRouter();

const HARI_LABEL: Record<HariKuliah, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
};

const programOptions = ref<{ value: string; label: string }[]>([]);
const selectedProgram = ref('');
const appliedProgram = ref('');
// Filter Prodi & Tahun Ajaran (default: tahun ajaran aktif); berlaku saat klik Periksa.
const prodiOptions = ref<{ value: string; label: string }[]>([]);
const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const selectedProdi = ref('');
const selectedTahunAjaran = ref<number | ''>('');
const applied = ref<{ kodeProdi: string; tahunAjaranId: number | '' }>({ kodeProdi: '', tahunAjaranId: '' });
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<JadwalKuliah[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({
    ...item,
    no: (page.value - 1) * pageSize.value + index + 1,
    total: item.sksTeori + item.sksPraktik + item.sksLab,
  }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'hari', label: 'Hari' },
  { key: 'ruangan', label: 'Ruang' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'kodeMataKuliah', label: 'Kode MK' },
  { key: 'namaMataKuliah', label: 'Mata Kuliah' },
  { key: 'dosenKordinator', label: 'Dosen' },
  { key: 'jam', label: 'Jam', align: 'center' },
  { key: 'sksTeori', label: 'Teori', align: 'center' },
  { key: 'sksPraktik', label: 'Prak', align: 'center' },
  { key: 'sksLab', label: 'Lab', align: 'center' },
  { key: 'total', label: 'Total', align: 'center' },
  { key: 'jumlahMahasiswa', label: 'Total Mahasiswa', align: 'center' },
  { key: 'detail', label: 'Detail', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await jadwalKuliahApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      kelas: appliedProgram.value || undefined,
      kodeProdi: applied.value.kodeProdi || undefined,
      tahunAjaranId: applied.value.tahunAjaranId || undefined,
      withJumlahMahasiswa: true,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data monitoring');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedProgram.value = selectedProgram.value;
  applied.value = { kodeProdi: selectedProdi.value, tahunAjaranId: selectedTahunAjaran.value };
  page.value = 1;
  fetchItems();
};

const openDetail = (id: number) => {
  router.push({ name: props.modul === 'prodi' ? 'prodi-monitoring-jadwal-detail' : 'baak-monitoring-detail', params: { id } });
};

watch(page, fetchItems);
watch(pageSize, () => {
  page.value = 1;
  fetchItems();
});

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

/** Pilihan Program (kelas) mengikuti prodi & tahun ajaran yang sedang dipilih. */
const loadProgramOptions = async () => {
  try {
    let kelasList: string[];
    if (selectedProdi.value || selectedTahunAjaran.value) {
      const result = await jadwalKuliahApi.list({
        limit: 1000,
        kodeProdi: selectedProdi.value || undefined,
        tahunAjaranId: selectedTahunAjaran.value || undefined,
      });
      kelasList = [...new Set(result.data.map((j) => j.kelas))].sort();
    } else {
      kelasList = await jadwalKuliahApi.kelasOptions();
    }
    programOptions.value = kelasList.map((k) => ({ value: k, label: k }));
    if (selectedProgram.value && !kelasList.includes(selectedProgram.value)) selectedProgram.value = '';
  } catch {
    programOptions.value = [];
  }
};
watch([selectedProdi, selectedTahunAjaran], loadProgramOptions);

onMounted(async () => {
  const [tahunAjaran, loginOptions] = await Promise.allSettled([tahunAjaranApi.list({ limit: 100 }), authApi.loginOptions()]);
  if (tahunAjaran.status === 'fulfilled') {
    tahunAjaranOptions.value = tahunAjaran.value.data.map((t) => ({ value: t.id, label: formatTahunAjaran(t) }));
    // Prodi: tahun akademik acuan sesi (kartu konteks), selain itu tahun ajaran aktif.
    const aktif =
      (props.modul === 'prodi' && tahunAjaranSesi ? tahunAjaran.value.data.find((t) => t.id === tahunAjaranSesi) : null) ??
      tahunAjaran.value.data.find((t) => t.isActive);
    if (aktif) {
      selectedTahunAjaran.value = aktif.id;
      applied.value = { ...applied.value, tahunAjaranId: aktif.id };
    }
  }
  if (loginOptions.status === 'fulfilled') {
    prodiOptions.value = loginOptions.value.prodi.map((p) => ({ value: p.kodeProdi, label: p.nama }));
  }
  if (prodiTerkunci.value && prodiSesi.value) {
    selectedProdi.value = prodiSesi.value.kodeProdi;
    applied.value = { ...applied.value, kodeProdi: prodiSesi.value.kodeProdi };
  }
  await loadProgramOptions();
  fetchItems();
});

const judulData = computed(() => {
  const bagian = [
    prodiOptions.value.find((p) => p.value === applied.value.kodeProdi)?.label,
    tahunAjaranOptions.value.find((t) => t.value === applied.value.tahunAjaranId)?.label,
    appliedProgram.value ? `Kelas ${appliedProgram.value}` : null,
  ].filter(Boolean);
  return bagian.length ? `Data Master Monitoring - ${bagian.join(' · ')}` : 'Semua Data Master Monitoring';
});
</script>

<template>
  <div>
    <PageHeader :title="modul === 'prodi' ? 'Monitoring Jadwal' : 'Master Monitoring'" subtitle="Pantau jadwal perkuliahan per program/kelas." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedProdi" placeholder="-- Semua Prodi --" :options="prodiOptions" :disabled="prodiTerkunci" />
        </div>
        <div class="w-full md:w-56">
          <SelectInput v-model="selectedTahunAjaran" placeholder="-- Semua Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <div class="w-full md:w-48">
          <SelectInput v-model="selectedProgram" placeholder="-- Pilih Program --" :options="programOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ judulData }}
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data jadwal kuliah">
        <template #cell-hari="{ item }">{{ item.hari && item.hari.length ? item.hari.map((h) => HARI_LABEL[h]).join(', ') : '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan || '-' }}</template>
        <template #cell-dosenKordinator="{ item }">{{ item.dosenKordinator?.namaLengkap ?? '-' }}</template>
        <template #cell-jam="{ item }">{{ item.jam ?? '-' }}</template>
        <template #cell-detail="{ item }">
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-on-primary hover:opacity-90 transition-opacity"
            title="Lihat Detail"
            @click="openDetail(item.id)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">description</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>
