<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { konversiKurikulumApi } from '@/api/konversiKurikulum';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import type { Jurusan, KonversiKurikulumRow, Kurikulum, KurikulumIdentifier, TahunAjaran } from '@/types/entities';

const jurusanList = ref<Jurusan[]>([]);
const tahunAjaranList = ref<TahunAjaran[]>([]);
const availableCombos = ref<KurikulumIdentifier[]>([]);
const loadingOptions = ref(true);

const comboLabel = (jurusanId: number, tahunAjaranId: number) => {
  const jurusan = jurusanList.value.find((j) => j.id === jurusanId);
  const tahunAjaran = tahunAjaranList.value.find((t) => t.id === tahunAjaranId);
  return `${jurusan?.namaJurusan ?? '-'} - ${tahunAjaran?.nama ?? '-'}`;
};

const comboOptions = computed<SelectOption[]>(() =>
  availableCombos.value.map((c) => ({
    value: `${c.jurusanId}:${c.tahunAjaranId}`,
    label: comboLabel(c.jurusanId, c.tahunAjaranId),
  }))
);

onMounted(async () => {
  try {
    const [jurusanResult, tahunAjaranResult, combos] = await Promise.all([
      jurusanApi.list({ limit: 200 }),
      tahunAjaranApi.list({ limit: 100 }),
      konversiKurikulumApi.filterOptions(),
    ]);
    jurusanList.value = jurusanResult.data;
    tahunAjaranList.value = tahunAjaranResult.data;
    availableCombos.value = combos;
  } finally {
    loadingOptions.value = false;
  }
});

const dariValue = ref('');
const keValue = ref('');
const search = ref('');

const rows = ref<KonversiKurikulumRow[]>([]);
const keOptionsRaw = ref<Kurikulum[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const mataKuliahLabel = (item: Kurikulum) => `[${item.kode}] ${item.mataKuliah} (${item.sksTotal})`;

const keOptions = computed<SelectOption[]>(() => keOptionsRaw.value.map((k) => ({ value: k.id, label: mataKuliahLabel(k) })));

const handlePeriksa = async () => {
  if (!dariValue.value) {
    toastError('Pilih Dari Kurikulum terlebih dahulu');
    return;
  }
  const [dariJurusanId, dariTahunAjaranId] = dariValue.value.split(':').map(Number);
  const [keJurusanId, keTahunAjaranId] = keValue.value ? keValue.value.split(':').map(Number) : [undefined, undefined];

  hasSearched.value = true;
  loading.value = true;
  error.value = null;
  try {
    const result = await konversiKurikulumApi.list({ dariJurusanId, dariTahunAjaranId, keJurusanId, keTahunAjaranId });
    rows.value = result.rows;
    keOptionsRaw.value = result.keOptions;
    Object.keys(draft).forEach((k) => delete draft[Number(k)]);
    result.rows.forEach((r) => {
      draft[r.dariKurikulum.id] = r.keKurikulumId ?? '';
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data konversi kurikulum');
  } finally {
    loading.value = false;
  }
};

const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase();
  const base = term
    ? rows.value.filter(
        (r) => r.dariKurikulum.kode.toLowerCase().includes(term) || r.dariKurikulum.mataKuliah.toLowerCase().includes(term)
      )
    : rows.value;
  return base.map((r, index) => ({ ...r, id: r.dariKurikulum.id, no: index + 1 }));
});

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'dari', label: 'Mata Kuliah' },
  { key: 'ke', label: 'Mata Kuliah' },
];

const draft = reactive<Record<number, number | ''>>({});

const savingId = ref<number | null>(null);
const handleSimpan = async (row: KonversiKurikulumRow) => {
  const dariId = row.dariKurikulum.id;
  const keId = draft[dariId];
  savingId.value = dariId;
  try {
    await konversiKurikulumApi.save(dariId, keId ? Number(keId) : null);
    toastSuccess('Konversi berhasil disimpan');
    const matched = keOptionsRaw.value.find((k) => k.id === Number(keId));
    row.keKurikulumId = keId ? Number(keId) : null;
    row.keKurikulum = matched ?? null;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan konversi'));
  } finally {
    savingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Konversi Kurikulum" subtitle="Petakan mata kuliah antar versi kurikulum." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-surface-bright">
        <SelectInput v-model="dariValue" label="Dari Kurikulum" placeholder="-- Pilih Kurikulum --" :disabled="loadingOptions" :options="comboOptions" />
        <SelectInput v-model="keValue" label="Ke Kurikulum" placeholder="-- Pilih Kurikulum --" :disabled="loadingOptions" :options="comboOptions" />
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Konversi Kurikulum</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari kode atau mata kuliah..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="filteredRows"
        :loading="loading"
        :show-actions="false"
        :empty-message="hasSearched ? 'Belum ada data' : 'Pilih Dari Kurikulum lalu klik Periksa'"
      >
        <template #cell-semester="{ item }">{{ item.dariKurikulum.semester ?? '-' }}</template>
        <template #cell-dari="{ item }">{{ mataKuliahLabel(item.dariKurikulum) }}</template>
        <template #cell-ke="{ item }">
          <div class="flex items-center gap-2">
            <span class="text-on-surface-variant text-label-sm shrink-0">
              - {{ item.keKurikulum?.sksTotal ?? 0 }}
            </span>
            <div class="w-64">
              <SelectInput v-model="draft[item.dariKurikulum.id]" placeholder="-- Pilih Mata Kuliah --" :options="keOptions" />
            </div>
            <AppButton :disabled="savingId === item.dariKurikulum.id" @click="handleSimpan(item)">
              {{ savingId === item.dariKurikulum.id ? 'Menyimpan...' : 'Simpan' }}
            </AppButton>
          </div>
        </template>
      </DataTable>
    </section>
  </div>
</template>
