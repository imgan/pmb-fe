<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import { akuntansiApi } from '@/api/akuntansi';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatDate } from '@/utils/format';
import type { Akun, BukuBesarData } from '@/types/entities';

interface Option {
  value: number;
  label: string;
}

const akunOptions = ref<Option[]>([]);
const selectedAkun = ref<number | ''>('');
const startDate = ref('');
const endDate = ref('');

const data = ref<BukuBesarData | null>(null);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const akunList: Akun[] = await akuntansiApi.listAkun();
    akunOptions.value = akunList.map((a) => ({ value: a.id, label: `${a.kode} - ${a.nama}` }));
    if (akunList.length) selectedAkun.value = akunList[0].id;
    if (selectedAkun.value) handleTampilkan();
  } catch {
    akunOptions.value = [];
  }
});

const handleTampilkan = async () => {
  if (!selectedAkun.value) return;
  loading.value = true;
  error.value = null;
  try {
    data.value = await akuntansiApi.bukuBesar({
      akunId: Number(selectedAkun.value),
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
    });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat buku besar');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Buku Besar" subtitle="Mutasi debit/kredit per akun (sesuai standar PSAK)." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end flex-wrap">
        <div class="w-full md:w-72">
          <SelectInput v-model="selectedAkun" label="Akun" placeholder="-- Pilih Akun --" :options="akunOptions" />
        </div>
        <div class="w-full md:w-48">
          <DateInput v-model="startDate" label="Dari Tanggal" />
        </div>
        <div class="w-full md:w-48">
          <DateInput v-model="endDate" label="Sampai Tanggal" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="data" class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between">
        <span>{{ data.akun.kode }} - {{ data.akun.nama }}</span>
        <span class="text-label-sm opacity-90">Saldo Akhir: {{ formatCurrencyIdr(data.saldoAkhir) }}</span>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && data && !data.mutasi.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada mutasi untuk akun & rentang tanggal ini.
      </p>

      <div v-else-if="data" class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Tanggal</th>
              <th class="p-3 border border-outline-variant">No Bukti</th>
              <th class="p-3 border border-outline-variant">Keterangan</th>
              <th class="p-3 border border-outline-variant text-right">Debit</th>
              <th class="p-3 border border-outline-variant text-right">Kredit</th>
              <th class="p-3 border border-outline-variant text-right">Saldo</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="(m, index) in data.mutasi" :key="index" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ formatDate(m.tanggal) }}</td>
              <td class="p-2 border border-outline-variant">{{ m.noBukti || '-' }}</td>
              <td class="p-2 border border-outline-variant">{{ m.keterangan || '-' }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ m.debit ? formatCurrencyIdr(m.debit) : '-' }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ m.kredit ? formatCurrencyIdr(m.kredit) : '-' }}</td>
              <td class="p-2 border border-outline-variant text-right font-medium">{{ formatCurrencyIdr(m.saldo) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
