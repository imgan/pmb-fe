<script setup lang="ts">
import { computed } from 'vue';
import RadarCpl from './RadarCpl.vue';
import type { TranskripObe } from '@/api/laporanCapaian';

/**
 * Laporan "Transkrip OBE" (per mahasiswa, atau rata-rata angkatan): kepala laporan (KOP opsional),
 * spiderchart rerata CPL vs target + performa (CPL tertinggi/terendah), tabel Hasil Capaian Pembelajaran
 * Lulusan (target, rerata, status, capaian, progres), keterangan & tanda tangan Ketua Program Studi.
 */
const props = defineProps<{
  data: TranskripObe;
  kop: boolean;
  kampus?: { namaKampus?: string | null; alamat?: string | null; logoUrl?: string | null } | null;
}>();

const angka = (v: number) => v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const radar = computed(() => props.data.cplTranskrip.map((c) => ({ kode: c.kode, capaian: c.rerata, target: c.target })));
const infoMahasiswa = computed(() =>
  props.data.mahasiswa
    ? `${props.data.mahasiswa.nim} - ${props.data.mahasiswa.nama}`
    : `Semua Mahasiswa${props.data.angkatan ? ` Angkatan ${props.data.angkatan}` : ''} (rata-rata ${props.data.jumlahMahasiswaBernilai} dari ${props.data.jumlahMahasiswa})`,
);
const infoSemester = computed(() =>
  props.data.semester ? `${props.data.semester}${props.data.semesterTerbilang ? ` (${props.data.semesterTerbilang})` : ''}` : '-',
);
const bernilai = computed(() => props.data.cplTranskrip.filter((c) => c.rerata !== null).sort((a, b) => b.rerata! - a.rerata!));
const tertinggi = computed(() => bernilai.value[0] ?? null);
const terendah = computed(() => bernilai.value[bernilai.value.length - 1] ?? null);
const kalimat = computed(() =>
  tertinggi.value && terendah.value
    ? `CPL mencatat rerata tertinggi sebesar ${angka(tertinggi.value.rerata!)} (${tertinggi.value.kode}), dengan batas terendah pada angka ${angka(terendah.value.rerata!)} (${terendah.value.kode}).`
    : 'Belum ada CPL yang dinilai.',
);
const STATUS = {
  MEMENUHI: { label: 'Sudah Memenuhi', cls: 'border-[#059669]/40 bg-[#059669]/10 text-[#05603a]' },
  BELUM_MEMENUHI: { label: 'Belum Memenuhi', cls: 'border-[#dc2626]/40 bg-[#dc2626]/10 text-[#991b1b]' },
  BELUM_DINILAI: { label: 'Belum Dinilai', cls: 'border-[#d1d5db] bg-[#f3f4f6] text-[#6b7280]' },
} as const;
const warnaNilai = (c: TranskripObe['cplTranskrip'][number]) =>
  c.status === 'MEMENUHI' ? 'text-[#05603a]' : c.status === 'BELUM_MEMENUHI' ? 'text-[#b91c1c]' : 'text-[#6b7280]';
const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const th = 'border border-[#9fb4cc] px-2 py-2 font-semibold';
const td = 'border border-[#c9d4e2] px-2 py-2 align-top';
</script>

<template>
  <div class="transkrip-obe bg-white text-[#1f2937] text-[12px] leading-snug space-y-5">
    <!-- Kepala laporan -->
    <div class="border border-[#c9d4e2] flex">
      <div v-if="kop" class="w-44 shrink-0 flex flex-col items-center justify-center gap-1 p-3 border-r border-[#c9d4e2] text-center">
        <img v-if="kampus?.logoUrl" :src="kampus.logoUrl" alt="Logo kampus" class="max-h-20 max-w-full object-contain" />
        <p v-if="kampus?.namaKampus" class="text-[11px] font-semibold uppercase">{{ kampus.namaKampus }}</p>
      </div>
      <table class="flex-1 border-collapse">
        <thead>
          <tr>
            <th colspan="2" class="bg-[#16467e] text-white text-center py-2 font-semibold uppercase tracking-wide">Transkrip OBE</th>
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

    <!-- Spiderchart + performa -->
    <div class="border border-[#c9d4e2] p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center break-inside-avoid">
      <div>
        <p class="font-semibold mb-2">Spiderchart Rerata CPL {{ data.mahasiswa ? 'Mahasiswa' : 'Angkatan' }}</p>
        <RadarCpl v-if="radar.length >= 3" :data="radar" />
        <p v-else class="text-[#6b7280] py-6">Spiderchart membutuhkan minimal 3 CPL (kurikulum ini punya {{ radar.length }}). Lihat tabel di bawah.</p>
      </div>
      <div>
        <p class="font-semibold mb-3">Performa Rerata CPL {{ data.mahasiswa ? 'Mahasiswa' : 'Angkatan' }}</p>
        <div class="inline-grid grid-cols-2 bg-[#f3f4f6] rounded-md">
          <div class="px-5 py-3 text-center border-r border-[#d1d5db]">
            <p class="text-[11px] text-[#4b5563]">CPL tertinggi</p>
            <p class="text-[26px] font-bold text-[#05603a] leading-tight">{{ tertinggi ? angka(tertinggi.rerata!) : '–' }}</p>
            <p class="text-[10px] text-[#6b7280]">{{ tertinggi ? `di posisi ${tertinggi.kode}` : 'belum ada nilai' }}</p>
          </div>
          <div class="px-5 py-3 text-center">
            <p class="text-[11px] text-[#4b5563]">CPL terendah</p>
            <p class="text-[26px] font-bold text-[#b91c1c] leading-tight">{{ terendah ? angka(terendah.rerata!) : '–' }}</p>
            <p class="text-[10px] text-[#6b7280]">{{ terendah ? `di posisi ${terendah.kode}` : 'belum ada nilai' }}</p>
          </div>
        </div>
        <p class="mt-3 italic text-[#374151]">{{ kalimat }}</p>
      </div>
    </div>

    <!-- Hasil CPL -->
    <div>
      <p class="font-semibold mb-2">Hasil Capaian Pembelajaran Lulusan</p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead class="bg-[#16467e] text-white">
            <tr>
              <th rowspan="2" :class="th" class="w-20">Kode CPL</th>
              <th rowspan="2" :class="th" class="text-left">Deskripsi CPL</th>
              <th colspan="3" :class="th">Target &amp; Evaluasi CPL</th>
              <th colspan="2" :class="th">Monitoring CPL</th>
            </tr>
            <tr>
              <th :class="th" class="w-16">Target</th>
              <th :class="th" class="w-16">Rerata</th>
              <th :class="th" class="w-32">Status</th>
              <th :class="th" class="w-16">Capaian</th>
              <th :class="th" class="w-16">Progres</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data.cplTranskrip.length">
              <td colspan="7" :class="td" class="text-center text-[#6b7280] py-6">Kurikulum ini belum memiliki CPL.</td>
            </tr>
            <tr v-for="c in data.cplTranskrip" :key="c.id" class="break-inside-avoid">
              <td :class="td" class="text-center font-medium">{{ c.kode }}</td>
              <td :class="td">{{ c.deskripsi }}</td>
              <td :class="td" class="text-center tabular-nums" :title="c.targetDefault ? 'Target default (MK pembeban belum diberi target CPL)' : 'Rata-rata target CPL mata kuliah pembeban'">
                {{ angka(c.target) }}<span v-if="c.targetDefault" class="text-[#9ca3af]">*</span>
              </td>
              <td :class="[td, warnaNilai(c)]" class="text-center tabular-nums font-medium">{{ c.rerata === null ? '-' : angka(c.rerata) }}</td>
              <td :class="td" class="text-center">
                <span class="inline-flex px-2 py-0.5 rounded border text-[10px] whitespace-nowrap" :class="STATUS[c.status].cls">{{ STATUS[c.status].label }}</span>
              </td>
              <td :class="td" class="text-center tabular-nums">{{ c.rerata === null ? '-' : angka(c.rerata) }}</td>
              <td :class="td" class="text-center">
                <span
                  class="inline-flex px-2 py-0.5 rounded border text-[10px] tabular-nums"
                  :class="c.jumlahMk && c.dinilai === c.jumlahMk ? 'border-[#059669]/40 bg-[#059669]/10 text-[#05603a]' : 'border-[#2563eb]/40 bg-[#2563eb]/5 text-[#1e40af]'"
                  :title="`${c.dinilai} dari ${c.jumlahMk} mata kuliah pembeban CPL ini sudah dinilai`"
                >
                  {{ c.dinilai }} / {{ c.jumlahMk }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Keterangan -->
    <div>
      <p class="font-semibold">Keterangan:</p>
      <p>Warna hijau menandakan CPL memenuhi target, sedangkan warna merah menunjukkan area yang masih perlu ditingkatkan.</p>
      <p class="text-[10px] text-[#6b7280] mt-1">
        Rerata/Capaian = rata-rata nilai CPL pada mata kuliah pembeban yang sudah dinilai; Progres = mata kuliah dinilai / mata kuliah pembeban CPL.
        Target = rata-rata target CPL mata kuliah pembeban (Setting Kurikulum); * = target default {{ angka(data.targetDefault) }}.
      </p>
    </div>

    <!-- Tanda tangan -->
    <div class="flex justify-end pt-4 break-inside-avoid">
      <div class="w-72 text-center">
        <p>{{ tanggal }}</p>
        <p>Ketua Program Studi {{ data.penandatangan.namaProdi ?? data.namaProdi ?? '' }}</p>
        <div class="h-16" />
        <p class="font-semibold underline">{{ data.penandatangan.kaprodi?.nama ?? '..............................' }}</p>
        <p v-if="data.penandatangan.kaprodi?.nuptk">NUPTK {{ data.penandatangan.kaprodi.nuptk }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .transkrip-obe {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
