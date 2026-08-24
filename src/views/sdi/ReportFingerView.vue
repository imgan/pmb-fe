<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { karyawanApi } from '@/api/karyawan';
import { reportFingerApi, type ShiftKerja } from '@/api/reportFinger';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { Karyawan } from '@/types/entities';

const karyawanList = ref<Karyawan[]>([]);
const loadingKaryawan = ref(true);
onMounted(async () => {
  try {
    const result = await karyawanApi.list({ page: 1, limit: 500 });
    karyawanList.value = result.data;
  } catch {
    // biarkan dropdown kosong; error akan muncul saat submit jika benar-benar diperlukan
  } finally {
    loadingKaryawan.value = false;
  }
});
const karyawanOptions = computed(() =>
  karyawanList.value.map((k) => ({ value: k.id, label: `${k.nip} - ${k.namaLengkap}` }))
);

const selectedKaryawan = ref<number | ''>('');
const periodeAwal = ref('');
const periodeAkhir = ref('');
const shift = ref<ShiftKerja>('SHIFT_1');

const SHIFT_OPTIONS: { value: ShiftKerja; label: string }[] = [
  { value: 'SHIFT_1', label: 'Shift 1' },
  { value: 'SHIFT_2', label: 'Shift 2' },
  { value: 'SHIFT_3', label: 'Shift 3' },
];

const loading = ref(false);
const handlePeriksa = async () => {
  if (!selectedKaryawan.value) {
    toastError('Pilih karyawan terlebih dahulu');
    return;
  }
  if (!periodeAwal.value || !periodeAkhir.value) {
    toastError('Periode awal dan akhir wajib diisi');
    return;
  }
  loading.value = true;
  try {
    const blob = await reportFingerApi.cetakPdf({
      karyawanId: selectedKaryawan.value,
      periodeAwal: periodeAwal.value,
      periodeAkhir: periodeAkhir.value,
      shift: shift.value,
    });
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuat rekap kehadiran'));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Report Finger" subtitle="Rekap kehadiran karyawan berdasarkan data sync finger." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <SelectInput
          v-model="selectedKaryawan"
          label="Karyawan"
          placeholder="-- Pilih Karyawan --"
          :disabled="loadingKaryawan"
          :options="karyawanOptions"
        />
        <DateInput v-model="periodeAwal" label="Periode Awal" />
        <DateInput v-model="periodeAkhir" label="Periode Akhir" />
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Jam Kerja</span>
          <div class="flex items-center gap-4 h-[42px]">
            <label v-for="opt in SHIFT_OPTIONS" :key="opt.value" class="flex items-center gap-1.5 text-body-sm text-on-surface cursor-pointer">
              <input type="radio" name="shift" :value="opt.value" v-model="shift" class="accent-primary" />
              {{ opt.label }}
            </label>
          </div>
        </div>
      </div>
      <div class="mt-4">
        <AppButton icon="search" :disabled="loading" @click="handlePeriksa">
          {{ loading ? 'Menyiapkan...' : 'Periksa' }}
        </AppButton>
      </div>
      <p class="mt-4 text-body-sm text-on-surface-variant">
        Klik "Periksa" untuk membuka rekap kehadiran (PDF) karyawan berdasarkan data yang tersinkron dari mesin
        fingerprint pada periode yang dipilih.
      </p>
    </section>
  </div>
</template>
