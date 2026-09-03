<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { simLulusanApi } from '@/api/simLulusan';
import { extractErrorMessage } from '@/api/http';
import type { LaporanLulusanRow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const tahunOptions = ref<Option[]>([]);
const prodiOptions = ref<Option[]>([]);
const selectedTahun = ref<number | ''>('');
const selectedProdi = ref<number | ''>('');

const rows = ref<LaporanLulusanRow[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const [tahunLulus, prodi] = await Promise.all([simLulusanApi.tahunLulusOptions(), simLulusanApi.prodiOptions()]);
    tahunOptions.value = tahunLulus.map((year) => ({ value: year, label: String(year) }));
    prodiOptions.value = prodi.map((p) => ({ value: p.id, label: p.namaJurusan }));
  } catch {
    tahunOptions.value = [];
    prodiOptions.value = [];
  }
});

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simLulusanApi.list({
      tahun: selectedTahun.value || undefined,
      jurusanId: selectedProdi.value || undefined,
    });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data lulusan');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Lulusan" subtitle="Rekap mahasiswa yang sudah yudisium (lulus)." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <h2 class="text-title-sm font-medium text-on-surface mb-4">Daftar Lulusan</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        <SelectInput v-model="selectedTahun" label="Tahun" placeholder="Pilih Tahun" :options="tahunOptions" />
        <SelectInput v-model="selectedProdi" label="Prodi" placeholder="Pilih Prodi" :options="prodiOptions" />
      </div>
      <AppButton class="mt-4" icon="search" :disabled="loading" @click="handleTampilkan">
        {{ loading ? 'Memuat...' : 'Tampilkan' }}
      </AppButton>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data lulusan untuk filter ini.
      </p>
      <p v-else-if="!loaded" class="p-8 text-center text-body-sm text-on-surface-variant">
        Pilih Tahun &amp; Prodi lalu klik Tampilkan.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">No.</th>
              <th class="p-3 border border-outline-variant">Tahun Lulus</th>
              <th class="p-3 border border-outline-variant">Jurusan</th>
              <th class="p-3 border border-outline-variant">NIM</th>
              <th class="p-3 border border-outline-variant">Nama</th>
              <th class="p-3 border border-outline-variant">IPK</th>
              <th class="p-3 border border-outline-variant">Lama Studi</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="(row, index) in rows" :key="`${row.nim}-${row.tahunLulus}`" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ index + 1 }}</td>
              <td class="p-2 border border-outline-variant">{{ row.tahunLulus }}</td>
              <td class="p-2 border border-outline-variant uppercase">{{ row.jurusan }}</td>
              <td class="p-2 border border-outline-variant">{{ row.nim }}</td>
              <td class="p-2 border border-outline-variant">{{ row.nama }}</td>
              <td class="p-2 border border-outline-variant">{{ row.ipk.toFixed(2) }}</td>
              <td class="p-2 border border-outline-variant">
                {{ row.lamaStudiSemester != null ? `${row.lamaStudiSemester} SEMESTER` : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
