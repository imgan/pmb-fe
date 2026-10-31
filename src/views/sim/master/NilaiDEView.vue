<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { simNilaiDEApi } from '@/api/simNilaiDE';
import { jurusanApi } from '@/api/jurusan';
import { mataKuliahApi } from '@/api/mataKuliah';
import { extractErrorMessage } from '@/api/http';
import type { NilaiDERow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const prodiOptions = ref<Option[]>([]);
const mataKuliahOptions = ref<Option[]>([]);
const selectedProdi = ref<string>('');
const selectedKodeMataKuliah = ref<string>('');

const rows = ref<NilaiDERow[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await jurusanApi.listProdi({ limit: 200 });
    const uniqueNames = [...new Set(data.map((j) => j.namaJurusan))].sort((a, b) => a.localeCompare(b));
    prodiOptions.value = uniqueNames.map((nama) => ({ value: nama, label: nama }));
  } catch {
    prodiOptions.value = [];
  }
  try {
    const { data } = await mataKuliahApi.list({ limit: 1000 });
    // Kode yang sama bisa ada di beberapa kurikulum: satu opsi per kode.
    const byKode = new Map(data.map((mk) => [mk.kode, mk]));
    mataKuliahOptions.value = [...byKode.values()]
      .sort((a, b) => a.kode.localeCompare(b.kode))
      .map((mk) => ({ value: mk.kode, label: `${mk.kode} - ${mk.mataKuliah}` }));
  } catch {
    mataKuliahOptions.value = [];
  }
});

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simNilaiDEApi.list({
      prodi: selectedProdi.value || undefined,
      kodeMataKuliah: selectedKodeMataKuliah.value || undefined,
    });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data nilai D & E');
  } finally {
    loading.value = false;
  }
};

handleTampilkan();

interface ProdiGroup {
  prodi: string;
  rows: NilaiDERow[];
}

const groups = computed<ProdiGroup[]>(() => {
  const map = new Map<string, NilaiDERow[]>();
  rows.value.forEach((row) => {
    const list = map.get(row.prodi) ?? [];
    list.push(row);
    map.set(row.prodi, list);
  });
  return [...map.entries()].map(([prodi, list]) => ({ prodi, rows: list }));
});
</script>

<template>
  <div>
    <PageHeader title="Nilai D & E" subtitle="Rekap mahasiswa dengan nilai D dan E." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-4">
      <div class="px-4 py-3 bg-primary-container text-on-primary-container text-label-md font-medium">
        Daftar Mahasiswa Nilai D dan E
      </div>
      <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect v-model="selectedProdi" label="Program Studi" placeholder="Pilih Program Studi" :options="prodiOptions" />
        <SearchableSelect v-model="selectedKodeMataKuliah" label="Kode Matkul" placeholder="Pilih Mata Kuliah" :options="mataKuliahOptions" />
      </div>
      <div class="px-4 pb-4">
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
      </div>
    </section>

    <div v-if="error" class="mb-4 p-4 text-body-sm text-error bg-error-container rounded-lg">{{ error }}</div>

    <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
    <p v-else-if="loaded && !groups.length" class="p-8 text-center text-body-sm text-on-surface-variant">
      Belum ada data nilai D/E untuk filter ini.
    </p>

    <section v-for="group in groups" :key="group.prodi" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-4">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-on-surface">
            <tr>
              <th class="p-3 border border-outline-variant font-semibold" colspan="1">Program Studi</th>
              <th class="p-3 border border-outline-variant font-semibold text-primary" colspan="5">{{ group.prodi }}</th>
            </tr>
            <tr class="text-primary font-semibold">
              <th class="p-3 border border-outline-variant">No.</th>
              <th class="p-3 border border-outline-variant">Kode Matkul</th>
              <th class="p-3 border border-outline-variant">Mata Kuliah</th>
              <th class="p-3 border border-outline-variant">SKS</th>
              <th class="p-3 border border-outline-variant">Nilai</th>
              <th class="p-3 border border-outline-variant">Jumlah</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="(row, index) in group.rows" :key="`${row.kodeMataKuliah}-${row.grade}-${index}`" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ index + 1 }}</td>
              <td class="p-2 border border-outline-variant">{{ row.kodeMataKuliah }}</td>
              <td class="p-2 border border-outline-variant">{{ row.namaMataKuliah }}</td>
              <td class="p-2 border border-outline-variant">{{ row.sks }}</td>
              <td class="p-2 border border-outline-variant">
                <StatusBadge :label="row.grade" :variant="row.grade === 'D' ? 'warning' : 'danger'" />
              </td>
              <td class="p-2 border border-outline-variant">
                <span class="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-md bg-primary text-on-primary font-medium">
                  {{ row.jumlah }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
