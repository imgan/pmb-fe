<script setup lang="ts">
import { computed } from 'vue';
import type { KonteksLaporanObe } from '@/api/laporanObe';
import { useKampusStore } from '@/stores/kampus';

/** Kepala laporan OBE: nama kampus, kotak logo + tabel info (judul jenis laporan, kurikulum, prodi, angkatan, dll). */
/** infoKhusus: ganti baris info bawaan (mis. CPMK per Mahasiswa menampilkan Mata Kuliah). */
const props = defineProps<{ judul: string; konteks: KonteksLaporanObe; infoKhusus?: [string, string][] }>();

const kampusStore = useKampusStore();
kampusStore.load();

const info = computed(() => props.infoKhusus ?? [
  ['Tahun Kurikulum', String(props.konteks.tahunKurikulum)],
  ['Program Studi', props.konteks.prodi],
  ['Angkatan', props.konteks.angkatan ? String(props.konteks.angkatan) : 'Semua Angkatan'],
  // Semua yang mengambil MK kurikulum; rerata dihitung dari yang sudah dinilai.
  [
    'Total Mahasiswa',
    props.konteks.jumlahDinilai !== undefined
      ? `${props.konteks.jumlahMahasiswa} (${props.konteks.jumlahDinilai} sudah dinilai)`
      : String(props.konteks.jumlahMahasiswa),
  ],
  ['Metode Perhitungan', props.konteks.metode === 'rerata' ? 'Rerata' : 'Progresif'],
]);
const td = 'px-3 py-2 border border-outline-variant';
</script>

<template>
  <div>
    <p class="text-center text-body-sm text-on-surface mb-3">{{ kampusStore.kampus?.namaKampus || 'Politeknik Bhakti Kartini' }}</p>
    <section class="grid grid-cols-1 md:grid-cols-[14rem_1fr] border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest">
      <div class="flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-outline-variant">
        <img v-if="kampusStore.kampus?.logoUrl" :src="kampusStore.kampus.logoUrl" :alt="kampusStore.kampus.namaKampus || 'Logo kampus'" class="max-h-24 w-auto object-contain" />
        <span v-else class="font-semibold text-primary text-center">{{ kampusStore.kampus?.namaKampus || 'Politeknik Bhakti Kartini' }}</span>
      </div>
      <table class="w-full text-body-sm border-collapse">
        <thead>
          <tr>
            <th colspan="2" class="px-3 py-2 bg-[#0b4a8b] text-white font-semibold text-center">{{ judul }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[l, v] in info" :key="l">
            <td :class="td" class="w-1/2 font-semibold">{{ l }}</td>
            <td :class="td">{{ v }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
