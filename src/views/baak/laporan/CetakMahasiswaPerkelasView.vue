<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { laporanMahasiswaPerkelasApi } from '@/api/laporanMahasiswaPerkelas';
import { extractErrorMessage } from '@/api/http';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { MahasiswaPerkelasFilterOptions } from '@/types/entities';

const options = ref<MahasiswaPerkelasFilterOptions>({ prodi: [], kelas: [], waktuKuliah: [], tahunMasuk: [] });
const loadingOptions = ref(true);

const prodiOptions = ref<{ value: number; label: string }[]>([]);
const kelasOptions = ref<{ value: string; label: string }[]>([]);
const waktuKuliahOptions = ref<{ value: string; label: string }[]>([]);
const tahunMasukOptions = ref<{ value: number; label: string }[]>([]);

const selectedProdi = ref<number | ''>('');
const selectedKelas = ref('');
const selectedWaktuKuliah = ref('');
const selectedTahunMasuk = ref<number | ''>('');

onMounted(async () => {
  try {
    options.value = await laporanMahasiswaPerkelasApi.filterOptions();
    prodiOptions.value = options.value.prodi.map((p) => ({
      value: p.id,
      label: p.kodeProdi ? `${p.kodeProdi} - ${p.namaJurusan.toUpperCase()}` : p.namaJurusan.toUpperCase(),
    }));
    kelasOptions.value = options.value.kelas.map((k) => ({ value: k, label: k }));
    waktuKuliahOptions.value = options.value.waktuKuliah.map((w) => ({ value: w, label: w }));
    tahunMasukOptions.value = options.value.tahunMasuk.map((t) => ({ value: t, label: String(t) }));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat opsi filter'));
  } finally {
    loadingOptions.value = false;
  }
});

const exporting = ref(false);
const handlePeriksa = async () => {
  exporting.value = true;
  try {
    const blob = await laporanMahasiswaPerkelasApi.exportExcel({
      jurusanId: selectedProdi.value || undefined,
      kelas: selectedKelas.value || undefined,
      waktuKuliah: selectedWaktuKuliah.value || undefined,
      tahunMasuk: selectedTahunMasuk.value || undefined,
    });
    downloadBlob(blob, 'laporan-mahasiswa-per-kelas.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh laporan'));
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Rekap Laporan Mahasiswa Per-Kelas" subtitle="Unduh rekap daftar mahasiswa per program studi dan kelas dalam format Excel." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <SelectInput
          v-model="selectedProdi"
          label="Prodi"
          placeholder="Semua Prodi"
          :options="prodiOptions"
          :disabled="loadingOptions"
        />
        <SelectInput
          v-model="selectedKelas"
          label="Kelas"
          placeholder="Semua Kelas"
          :options="kelasOptions"
          :disabled="loadingOptions"
        />
        <SelectInput
          v-model="selectedWaktuKuliah"
          label="Waktu Kuliah"
          placeholder="Semua Waktu"
          :options="waktuKuliahOptions"
          :disabled="loadingOptions"
        />
        <SelectInput
          v-model="selectedTahunMasuk"
          label="Tahun Masuk"
          placeholder="Semua Tahun"
          :options="tahunMasukOptions"
          :disabled="loadingOptions"
        />
      </div>
      <div class="mt-4">
        <AppButton icon="search" :disabled="exporting" @click="handlePeriksa">
          {{ exporting ? 'Menyiapkan file...' : 'Periksa' }}
        </AppButton>
      </div>
      <p class="mt-4 text-body-sm text-on-surface-variant">
        Klik "Periksa" untuk mengunduh rekap daftar mahasiswa (NIM, Nama, Status Masuk) sesuai filter yang dipilih
        dalam format Excel (.xlsx). Kosongkan filter untuk mengunduh seluruh data.
      </p>
    </section>
  </div>
</template>
