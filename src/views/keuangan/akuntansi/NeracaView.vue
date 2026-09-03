<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import DateInput from '@/components/ui/DateInput.vue';
import { akuntansiApi } from '@/api/akuntansi';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr } from '@/utils/format';
import type { NeracaData } from '@/types/entities';

const tanggal = ref('');
const data = ref<NeracaData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await akuntansiApi.neraca({ tanggal: tanggal.value || undefined });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat neraca');
  } finally {
    loading.value = false;
  }
};

onMounted(handleTampilkan);
</script>

<template>
  <div>
    <PageHeader title="Neraca" subtitle="Posisi keuangan (Aset = Kewajiban + Ekuitas) sesuai standar PSAK." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-56">
          <DateInput v-model="tanggal" label="Per Tanggal" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
      </div>
    </section>

    <div v-if="error" class="mb-4 p-4 text-body-sm text-error bg-error-container rounded-lg">{{ error }}</div>
    <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

    <template v-else-if="data">
      <div
        class="mb-4 px-4 py-2.5 rounded-md text-body-sm text-center font-medium"
        :class="data.isBalance ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'"
      >
        {{ data.isBalance ? 'Neraca balance: Aset = Kewajiban + Ekuitas' : 'Neraca TIDAK balance — periksa jurnal' }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Aset</div>
          <table class="w-full text-left border-collapse text-body-sm">
            <tbody class="text-on-surface">
              <tr v-for="akun in data.aset" :key="akun.id" class="border-b border-outline-variant">
                <td class="p-2">{{ akun.kode }} - {{ akun.nama }}</td>
                <td class="p-2 text-right">{{ formatCurrencyIdr(akun.saldo) }}</td>
              </tr>
              <tr class="font-semibold bg-surface-container-low">
                <td class="p-2">Total Aset</td>
                <td class="p-2 text-right">{{ formatCurrencyIdr(data.totalAset) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div class="space-y-4">
          <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Kewajiban</div>
            <table class="w-full text-left border-collapse text-body-sm">
              <tbody class="text-on-surface">
                <tr v-for="akun in data.kewajiban" :key="akun.id" class="border-b border-outline-variant">
                  <td class="p-2">{{ akun.kode }} - {{ akun.nama }}</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(akun.saldo) }}</td>
                </tr>
                <tr class="font-semibold bg-surface-container-low">
                  <td class="p-2">Total Kewajiban</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(data.totalKewajiban) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Ekuitas</div>
            <table class="w-full text-left border-collapse text-body-sm">
              <tbody class="text-on-surface">
                <tr v-for="akun in data.ekuitas" :key="akun.id" class="border-b border-outline-variant">
                  <td class="p-2">{{ akun.kode }} - {{ akun.nama }}</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(akun.saldo) }}</td>
                </tr>
                <tr class="border-b border-outline-variant">
                  <td class="p-2">Laba Ditahan Berjalan</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(data.labaBerjalan) }}</td>
                </tr>
                <tr class="font-semibold bg-surface-container-low">
                  <td class="p-2">Total Ekuitas</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(data.totalEkuitas) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
