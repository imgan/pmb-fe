<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { konversiKurikulumApi } from '@/api/konversiKurikulum';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import type { KonversiKurikulumRow, KurikulumOption, MataKuliah } from '@/types/entities';

/**
 * Konversi kurikulum: pilih kurikulum asal (Dari) & tujuan (Ke), lalu petakan tiap mata kuliah
 * kurikulum asal ke padanannya di kurikulum tujuan.
 */
const kurikulumList = ref<KurikulumOption[]>([]);
const loadingOptions = ref(true);
const comboOptions = computed<SelectOption[]>(() =>
  kurikulumList.value.map((k) => ({ value: k.value, label: `${k.label}${k.isActive === false ? ' (nonaktif)' : ''}` }))
);

onMounted(async () => {
  try {
    kurikulumList.value = await konversiKurikulumApi.filterOptions();
  } finally {
    loadingOptions.value = false;
  }
});

const dariValue = ref<number | ''>('');
const keValue = ref<number | ''>('');
const search = ref('');

const rows = ref<KonversiKurikulumRow[]>([]);
const keOptionsRaw = ref<MataKuliah[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const mataKuliahLabel = (item: MataKuliah) => `[${item.kode}] ${item.mataKuliah} (${item.sksTotal})`;

const keOptions = computed<SelectOption[]>(() => keOptionsRaw.value.map((k) => ({ value: k.id, label: mataKuliahLabel(k) })));

const handlePeriksa = async () => {
  if (!dariValue.value) {
    toastError('Pilih Dari Kurikulum terlebih dahulu');
    return;
  }
  if (keValue.value && keValue.value === dariValue.value) {
    toastError('Ke Kurikulum harus berbeda dengan Dari Kurikulum');
    return;
  }

  hasSearched.value = true;
  loading.value = true;
  error.value = null;
  try {
    const result = await konversiKurikulumApi.list({ dariKurikulumId: Number(dariValue.value), keKurikulumId: keValue.value ? Number(keValue.value) : undefined });
    rows.value = result.rows;
    keOptionsRaw.value = result.keOptions;
    Object.keys(draft).forEach((k) => delete draft[Number(k)]);
    result.rows.forEach((r) => {
      draft[r.dariMataKuliah.id] = r.keMataKuliahId ?? '';
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
        (r) => r.dariMataKuliah.kode.toLowerCase().includes(term) || r.dariMataKuliah.mataKuliah.toLowerCase().includes(term)
      )
    : rows.value;
  return base.map((r, index) => ({ ...r, id: r.dariMataKuliah.id, no: index + 1 }));
});

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'dari', label: 'Mata Kuliah' },
  { key: 'ke', label: 'Mata Kuliah' },
];

const draft = reactive<Record<number, number | ''>>({});

// SKS mata kuliah tujuan yang sedang dipilih di dropdown (ditampilkan "- n" di depan dropdown).
const draftSks = (dariId: number) => keOptionsRaw.value.find((k) => k.id === Number(draft[dariId]))?.sksTotal ?? 0;

const savingId = ref<number | null>(null);

const handleBatal = async (row: KonversiKurikulumRow) => {
  const dariId = row.dariMataKuliah.id;
  const confirmed = await confirmAction({
    title: 'Batalkan konversi?',
    text: `Pemetaan ${row.dariMataKuliah.kode} - ${row.dariMataKuliah.mataKuliah} akan dihapus.`,
  });
  if (!confirmed) return;

  savingId.value = dariId;
  try {
    await konversiKurikulumApi.save(dariId, null);
    toastSuccess('Konversi dibatalkan');
    row.keMataKuliahId = null;
    row.keMataKuliah = null;
    draft[dariId] = '';
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membatalkan konversi'));
  } finally {
    savingId.value = null;
  }
};

const handleSimpan = async (row: KonversiKurikulumRow) => {
  const dariId = row.dariMataKuliah.id;
  const keId = draft[dariId];
  if (!keId) {
    toastError('Pilih mata kuliah tujuan terlebih dahulu');
    return;
  }
  savingId.value = dariId;
  try {
    await konversiKurikulumApi.save(dariId, keId ? Number(keId) : null);
    toastSuccess('Konversi berhasil disimpan');
    const matched = keOptionsRaw.value.find((k) => k.id === Number(keId));
    row.keMataKuliahId = keId ? Number(keId) : null;
    row.keMataKuliah = matched ?? null;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan konversi'));
  } finally {
    savingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Konversi Kurikulum" subtitle="Petakan mata kuliah kurikulum lama ke penggantinya di kurikulum baru — dipakai mahasiswa saat mengisi KRS mengulang beda kurikulum; nilai lama & nilai ulang tidak dihitung ganda." />

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
        <template #cell-semester="{ item }">{{ item.dariMataKuliah.semester ?? '-' }}</template>
        <template #cell-dari="{ item }">{{ mataKuliahLabel(item.dariMataKuliah) }}</template>
        <template #cell-ke="{ item }">
          <div v-if="item.keMataKuliah" class="flex items-center gap-2">
            <span class="text-on-surface">
              {{ item.keMataKuliah.kode }} - {{ item.keMataKuliah.mataKuliah }} ({{ item.keMataKuliah.sksTotal }})
            </span>
            <AppButton
              variant="secondary"
              :disabled="savingId === item.dariMataKuliah.id"
              @click="handleBatal(item)"
            >
              {{ savingId === item.dariMataKuliah.id ? 'Memproses...' : 'Batal' }}
            </AppButton>
          </div>
          <div v-else class="flex items-center gap-2">
            <span class="text-on-surface-variant text-label-sm shrink-0">
              - {{ draftSks(item.dariMataKuliah.id) }}
            </span>
            <div class="w-64">
              <SelectInput
                v-model="draft[item.dariMataKuliah.id]"
                placeholder="-- Pilih Mata Kuliah --"
                :disabled="!keOptions.length"
                :options="keOptions"
              />
            </div>
            <AppButton
              :disabled="savingId === item.dariMataKuliah.id || !draft[item.dariMataKuliah.id]"
              @click="handleSimpan(item)"
            >
              {{ savingId === item.dariMataKuliah.id ? 'Menyimpan...' : 'Simpan' }}
            </AppButton>
          </div>
        </template>
      </DataTable>
    </section>
  </div>
</template>
