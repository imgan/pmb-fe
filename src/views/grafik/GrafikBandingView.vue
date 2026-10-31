<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { pmbGrafikApi, type GrafikBanding } from '@/api/pmbGrafik';
import { extractErrorMessage } from '@/api/http';

const tahunOptions = ref<{ value: number; label: string }[]>([]);
const tahun = ref<number | ''>(new Date().getFullYear());
const data = ref<GrafikBanding | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const fetchData = async () => {
  if (!tahun.value) return;
  loading.value = true;
  error.value = null;
  try {
    data.value = await pmbGrafikApi.banding(Number(tahun.value));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat grafik banding');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const years = await pmbGrafikApi.tahunOptions();
    tahunOptions.value = years.map((y) => ({ value: y, label: String(y) }));
    if (years.length) tahun.value = years[0];
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan tahun');
  }
  fetchData();
});

watch(tahun, fetchData);

// Grafik batang per bulan: tinggi batang relatif terhadap nilai tertinggi tahun tsb.
const SERIES_COLORS: Record<string, string> = {
  mendaftar: 'bg-primary',
  seleksi: 'bg-[#4F8FC0]',
  wawancara: 'bg-[#E0A93B]',
  du: 'bg-[#3E9B6C]',
};
const maxValue = computed(() => Math.max(1, ...(data.value?.rows.flatMap((r) => r.values) ?? [0])));
const barHeight = (value: number) => `${Math.round((value / maxValue.value) * 100)}%`;
const isEmpty = computed(() => (data.value?.rows.every((r) => r.total === 0) ?? true));
</script>

<template>
  <div>
    <PageHeader title="Master Grafik Banding" subtitle="Perbandingan tahap pendaftaran PMB per bulan." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex items-center gap-3">
        <span class="font-medium text-label-md text-on-surface">Pilih Tahun</span>
        <div class="w-40">
          <SelectInput v-model="tahun" :options="tahunOptions" placeholder="Pilih tahun" />
        </div>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Grafik Banding</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

      <template v-else-if="data">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-body-sm">
            <thead class="border-b border-outline-variant">
              <tr class="text-label-md text-on-surface font-semibold">
                <th class="p-3">Bulan</th>
                <th v-for="b in data.bulan" :key="b" class="p-3 text-center">{{ b }}</th>
                <th class="p-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-on-surface">
              <tr v-for="row in data.rows" :key="row.key">
                <td class="p-3 font-medium">{{ row.label }}</td>
                <td v-for="(v, i) in row.values" :key="i" class="p-3 text-center">{{ v }}</td>
                <td class="p-3 text-center font-semibold">{{ row.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-4 border-t border-outline-variant">
          <div class="flex flex-wrap gap-4 mb-3 text-label-sm text-on-surface-variant">
            <span v-for="row in data.rows" :key="row.key" class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-sm" :class="SERIES_COLORS[row.key]"></span>{{ row.label }}
            </span>
          </div>
          <p v-if="isEmpty" class="py-6 text-center text-body-sm text-on-surface-variant">
            Belum ada data pendaftar pada tahun {{ data.tahun }}.
          </p>
          <div v-else class="overflow-x-auto">
            <div class="flex items-end gap-3 h-48 min-w-[720px]">
              <div v-for="(b, i) in data.bulan" :key="b" class="flex-1 flex flex-col items-center h-full">
                <div class="flex items-end gap-0.5 flex-1 w-full justify-center">
                  <div
                    v-for="row in data.rows"
                    :key="row.key"
                    class="w-2.5 rounded-t"
                    :class="SERIES_COLORS[row.key]"
                    :style="{ height: barHeight(row.values[i]) }"
                    :title="`${row.label} ${b}: ${row.values[i]}`"
                  ></div>
                </div>
                <span class="mt-1 text-label-sm text-on-surface-variant">{{ b.slice(0, 3) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
