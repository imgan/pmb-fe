<script setup lang="ts">
import { computed } from 'vue';
import type { LaporanCplMataKuliah } from '@/api/laporanCapaian';

/**
 * Tampilan laporan "CPL per Mata Kuliah" (dipakai di halaman Laporan Capaian OBE & versi cetak tab baru):
 * KOP opsional (logo kampus) + info laporan, daftar CPL program studi, tabel nilai CPL tiap mata kuliah,
 * dan keterangan hasil (CPL tertinggi, terendah, rata-rata). Warna & ukuran ramah cetak.
 */
const props = defineProps<{
  data: LaporanCplMataKuliah;
  kop: boolean;
  kampus?: { namaKampus?: string | null; alamat?: string | null; logoUrl?: string | null } | null;
}>();

const angka = (v: number) => v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sel = (v: number | null | '-') => (v === '-' ? '-' : v === null ? '' : angka(v));
const infoMahasiswa = computed(() =>
  props.data.mahasiswa
    ? `${props.data.mahasiswa.nim} - ${props.data.mahasiswa.nama}`
    : `Semua Mahasiswa${props.data.angkatan ? ` Angkatan ${props.data.angkatan}` : ''} (rata-rata ${props.data.jumlahMahasiswaBernilai} dari ${props.data.jumlahMahasiswa} mahasiswa bernilai)`,
);
const infoSemester = computed(() =>
  props.data.semester ? `${props.data.semester}${props.data.semesterTerbilang ? ` (${props.data.semesterTerbilang})` : ''}` : '-',
);
const keterangan = computed(() => {
  const r = props.data.ringkasan;
  if (!r.tertinggi || !r.terendah || r.rataRata === null) return null;
  return {
    kalimat1: `Capaian Pembelajaran Lulusan (CPL) mencatat capaian tertinggi sebesar ${angka(r.tertinggi.nilai)} (${r.tertinggi.kode}), dengan batas terendah pada angka ${angka(r.terendah.nilai)} (${r.terendah.kode}).`,
    kalimat2: `Secara keseluruhan, rata-rata CPL berada pada angka ${angka(r.rataRata)}.`,
  };
});
const th = 'border border-[#9fb4cc] px-2 py-2 font-semibold';
const td = 'border border-[#c9d4e2] px-2 py-2';
</script>

<template>
  <div class="laporan-cpl bg-white text-[#1f2937] text-[12px] leading-snug space-y-4">
    <!-- Kepala laporan -->
    <div class="border border-[#c9d4e2] flex">
      <div v-if="kop" class="w-44 shrink-0 flex flex-col items-center justify-center gap-1 p-3 border-r border-[#c9d4e2] text-center">
        <img v-if="kampus?.logoUrl" :src="kampus.logoUrl" alt="Logo kampus" class="max-h-20 max-w-full object-contain" />
        <p v-if="kampus?.namaKampus" class="text-[11px] font-semibold uppercase">{{ kampus.namaKampus }}</p>
      </div>
      <table class="flex-1 border-collapse">
        <thead>
          <tr>
            <th colspan="2" class="bg-[#16467e] text-white text-center py-2 font-semibold uppercase tracking-wide">CPL per Mata Kuliah</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[label, nilai] in [
            ['Tahun Kurikulum', data.kurikulum.tahunKurikulum ?? data.kurikulum.nama],
            ['Mahasiswa', infoMahasiswa],
            ['Program Studi', data.prodi ?? '-'],
            ['Semester', infoSemester],
          ] as [string, string | number][]" :key="label">
            <td :class="td" class="w-1/2 font-semibold">{{ label }}</td>
            <td :class="td">{{ nilai }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="kop && kampus?.alamat" class="-mt-2 text-[10px] text-[#6b7280]">{{ kampus.alamat }}</p>

    <!-- Daftar CPL -->
    <div class="border border-[#c9d4e2] p-4">
      <p class="font-semibold mb-3">CPL Program Studi - {{ data.namaProdi ?? data.prodi ?? '-' }}</p>
      <p v-if="!data.cpl.length" class="text-[#6b7280]">Kurikulum ini belum memiliki CPL.</p>
      <ul class="space-y-2">
        <li v-for="c in data.cpl" :key="c.id" class="grid grid-cols-[6rem_1fr] gap-2">
          <span class="flex gap-2"><span>•</span>{{ c.kode }}</span>
          <span>{{ c.deskripsi }}</span>
        </li>
      </ul>
    </div>

    <!-- Tabel nilai CPL -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead class="bg-[#16467e] text-white">
          <tr>
            <th rowspan="2" :class="th" class="w-20">Semester</th>
            <th rowspan="2" :class="th" class="text-left">Nama Mata Kuliah</th>
            <th rowspan="2" :class="th" class="w-14">SKS</th>
            <th :colspan="Math.max(data.cpl.length, 1)" :class="th">Nilai CPL</th>
          </tr>
          <tr>
            <th v-for="c in data.cpl" :key="c.id" :class="th" class="min-w-16">{{ c.kode }}</th>
            <th v-if="!data.cpl.length" :class="th">-</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!data.baris.length">
            <td :colspan="data.cpl.length + 3" :class="td" class="text-center text-[#6b7280] py-6">
              Belum ada mata kuliah OBE di kurikulum ini yang dibebankan CPL.
            </td>
          </tr>
          <tr v-for="b in data.baris" :key="b.mataKuliahId">
            <td :class="td" class="text-center">{{ b.semester ?? '-' }}</td>
            <td :class="td">{{ b.mataKuliah }}</td>
            <td :class="td" class="text-center">{{ b.sks }}</td>
            <td
              v-for="c in data.cpl"
              :key="c.id"
              :class="[td, b.nilai[c.id] === null ? 'bg-[#f1f4f8]' : '']"
              class="text-center tabular-nums"
            >
              {{ sel(b.nilai[c.id]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Keterangan -->
    <div>
      <p class="font-semibold">Keterangan Hasil CPL:</p>
      <template v-if="keterangan">
        <p>{{ keterangan.kalimat1 }}</p>
        <p>{{ keterangan.kalimat2 }}</p>
      </template>
      <p v-else class="text-[#6b7280]">Belum ada nilai CPL yang dapat dihitung (nilai OBE per CPMK belum diinput atau CPMK belum dipetakan ke CPL).</p>
      <p class="mt-2 text-[10px] text-[#6b7280]">
        "-" = mata kuliah tidak dibebankan CPL tsb; sel kosong = belum ada nilai. Nilai CPL = rata-rata berbobot capaian CPMK yang dipetakan ke CPL
        (Pemetaan CPMK), dari nilai OBE per CPMK yang diinput dosen.
      </p>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .laporan-cpl {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
