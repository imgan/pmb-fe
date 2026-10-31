<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { pesertaApi, type GrafikTahunanRow } from '@/api/peserta';
import { extractErrorMessage } from '@/api/http';

const thisYear = new Date().getFullYear();
const dariTanggal = ref(`${thisYear - 2}-01-01`);
const sampaiTanggal = ref(new Date().toISOString().slice(0, 10));
const range = ref({ dari: dariTanggal.value, sampai: sampaiTanggal.value });
const rows = ref<GrafikTahunanRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const METRICS: { key: keyof Omit<GrafikTahunanRow, 'tahun'>; label: string; color: string }[] = [
  { key: 'tamu', label: 'Tamu', color: '#1b365d' },
  { key: 'mendaftar', label: 'Mendaftar', color: '#b1913f' },
  { key: 'daftarUlang', label: 'Daftar Ulang', color: '#059669' },
];

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await pesertaApi.grafikTahunan({
      dariTanggal: dariTanggal.value || undefined,
      sampaiTanggal: sampaiTanggal.value || undefined,
    });
    range.value = { dari: dariTanggal.value, sampai: sampaiTanggal.value };
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat grafik tahunan');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);

// Grafik batang per tahun: tinggi batang relatif terhadap nilai tertinggi di rentang tsb.
const maxValue = computed(() => Math.max(1, ...rows.value.flatMap((r) => METRICS.map((m) => r[m.key]))));
const barHeight = (value: number) => `${Math.round((value / maxValue.value) * 100)}%`;
</script>

<template>
  <div>
    <PageHeader title="Master Grafik Tahunan" subtitle="Jumlah tamu, pendaftar, dan daftar ulang PMB per tahun." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <form
        class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col sm:flex-row gap-3 sm:items-end"
        @submit.prevent="fetchData"
      >
        <div class="w-full sm:w-48">
          <DateInput v-model="dariTanggal" label="Dari Tanggal" />
        </div>
        <div class="w-full sm:w-48">
          <DateInput v-model="sampaiTanggal" label="Sampai Tanggal" />
        </div>
        <AppButton type="submit" icon="search" :disabled="loading">Cari</AppButton>
      </form>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Grafik Tahunan Dari {{ range.dari || '-' }} s/d {{ range.sampai || '-' }}
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else-if="!rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data peserta pada rentang tanggal ini.
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-body-sm">
            <thead class="border-b border-outline-variant">
              <tr class="text-label-md text-on-surface font-semibold">
                <th class="p-3">Tahun</th>
                <th v-for="row in rows" :key="row.tahun" class="p-3 text-right">{{ row.tahun }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-on-surface">
              <tr v-for="m in METRICS" :key="m.key">
                <td class="p-3 font-medium">{{ m.label }}</td>
                <td v-for="row in rows" :key="row.tahun" class="p-3 text-right tabular-nums">{{ row[m.key] }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-4 border-t border-outline-variant">
          <h3 class="font-semibold text-label-lg text-on-surface mb-2">Grafik Tahunan</h3>
          <div class="flex flex-wrap gap-4 mb-4 text-label-sm text-on-surface-variant">
            <span v-for="m in METRICS" :key="m.key" class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-sm" :style="{ backgroundColor: m.color }"></span>{{ m.label }}
            </span>
          </div>
          <div class="overflow-x-auto">
            <div class="flex items-end gap-8 h-64 px-2" :style="{ minWidth: `${rows.length * 140}px` }">
              <div v-for="row in rows" :key="row.tahun" class="flex-1 flex flex-col items-center h-full">
                <div class="flex items-end gap-2 flex-1 w-full justify-center">
                  <div v-for="m in METRICS" :key="m.key" class="flex flex-col items-center justify-end h-full w-8">
                    <span class="text-label-sm text-on-surface-variant tabular-nums mb-1">{{ row[m.key] }}</span>
                    <div
                      class="w-full rounded-t"
                      :style="{ height: barHeight(row[m.key]), backgroundColor: m.color }"
                      :title="`${m.label} ${row.tahun}: ${row[m.key]}`"
                    ></div>
                  </div>
                </div>
                <span class="mt-2 text-label-md font-medium text-on-surface">{{ row.tahun }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
