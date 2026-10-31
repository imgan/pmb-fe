<script setup lang="ts">
import { computed } from 'vue';
import type { KonteksLaporanObe, StatusCpmkMahasiswa } from '@/api/laporanObe';
import LaporanObeKepala from './LaporanObeKepala.vue';

/**
 * Laporan OBE → CPMK per Mahasiswa (satu mata kuliah): kepala laporan, detail CPMK, tabel nilai CPMK tiap mahasiswa
 * dengan baris Target CPMK, status capaian (Sudah = semua CPMK mencapai target) dan rerata.
 */
const props = defineProps<{
  konteks: KonteksLaporanObe & { jumlahDinilai?: number };
  mataKuliah: { id: number; kode: string; mataKuliah: string; sks: number; semester: number | null; isObe: boolean; targetCpmk: number | null };
  kolom: { id: number; kode: string; deskripsi: string }[];
  rows: { id: number; nim: string; nama: string; nilai: Record<string, number | null>; status: StatusCpmkMahasiswa }[];
  rerata: Record<string, number | null>;
}>();

const angka = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const info = computed<[string, string][]>(() => [
  ['Tahun Kurikulum', String(props.konteks.tahunKurikulum)],
  ['Program Studi', props.konteks.prodi],
  ['Mata Kuliah', `${props.mataKuliah.kode} - ${props.mataKuliah.mataKuliah}`],
  ['Angkatan', props.konteks.angkatan ? String(props.konteks.angkatan) : 'Semua Angkatan'],
]);
const diBawah = (v: number | null) => props.mataKuliah.targetCpmk !== null && v !== null && v < props.mataKuliah.targetCpmk;

const STATUS: Record<StatusCpmkMahasiswa, { label: string; icon: string; cls: string }> = {
  SUDAH: { label: 'Sudah Memenuhi', icon: 'check_circle', cls: 'border-[#059669]/40 bg-[#059669]/10 text-[#05603a]' },
  BELUM: { label: 'Belum Memenuhi', icon: 'cancel', cls: 'border-error/40 bg-error-container/50 text-on-error-container' },
  BELUM_DINILAI: { label: 'Belum Dinilai', icon: 'remove', cls: 'border-outline-variant bg-surface-container text-on-surface-variant' },
  TANPA_TARGET: { label: 'Target Belum Diisi', icon: 'help', cls: 'border-outline-variant bg-surface-container text-on-surface-variant' },
};
const jumlah = computed(() => {
  const n: Record<StatusCpmkMahasiswa, number> = { SUDAH: 0, BELUM: 0, BELUM_DINILAI: 0, TANPA_TARGET: 0 };
  props.rows.forEach((r) => (n[r.status] += 1));
  return n;
});

const th = 'px-3 py-2.5 border border-white/25 font-semibold';
const td = 'px-3 py-2 border border-outline-variant';
</script>

<template>
  <div class="space-y-5">
    <LaporanObeKepala judul="CPMK PER MAHASISWA" :konteks="konteks" :info-khusus="info" />

    <!-- Detail CPMK -->
    <section class="border border-outline-variant rounded-lg p-5 bg-surface-container-lowest">
      <h3 class="font-semibold text-on-surface mb-3">Detail CPMK Mata Kuliah:</h3>
      <p v-if="!kolom.length" class="text-body-sm text-on-surface-variant">Mata kuliah ini belum memiliki CPMK (isi di RPS → Pemetaan CPMK).</p>
      <dl class="space-y-2 text-body-sm">
        <div v-for="c in kolom" :key="c.id" class="grid grid-cols-[6rem_1fr] gap-3">
          <dt class="font-medium before:content-['•'] before:mr-2">{{ c.kode }}</dt>
          <dd>{{ c.deskripsi }}</dd>
        </div>
      </dl>
    </section>

    <!-- Nilai CPMK -->
    <div class="overflow-x-auto border border-outline-variant rounded-lg">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-[#0b4a8b] text-white">
          <tr>
            <th rowspan="2" :class="th" class="w-12 text-center">No.</th>
            <th rowspan="2" :class="th" class="text-left">NIM</th>
            <th rowspan="2" :class="th" class="text-left min-w-[12rem]">Nama Mahasiswa</th>
            <th :colspan="Math.max(kolom.length, 1)" :class="th" class="text-center">Nilai CPMK</th>
            <th rowspan="2" :class="th" class="text-center w-44">Status Capaian</th>
          </tr>
          <tr>
            <th v-for="c in kolom" :key="c.id" :class="th" class="text-center min-w-[4.5rem]" :title="c.deskripsi">{{ c.kode }}</th>
            <th v-if="!kolom.length" :class="th" />
          </tr>
          <tr class="bg-[#0b4a8b]/90">
            <td :class="th" colspan="3">Target CPMK</td>
            <td v-for="c in kolom" :key="c.id" :class="th" class="text-right tabular-nums">{{ angka(mataKuliah.targetCpmk) }}</td>
            <td v-if="!kolom.length" :class="th" />
            <td :class="th" />
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td :colspan="kolom.length + 4" :class="td" class="p-6 text-center text-on-surface-variant">Belum ada mahasiswa yang mengambil mata kuliah ini.</td>
          </tr>
          <tr v-for="(r, i) in rows" :key="r.id">
            <td :class="td" class="text-center">{{ i + 1 }}.</td>
            <td :class="td" class="whitespace-nowrap">{{ r.nim }}</td>
            <td :class="td">{{ r.nama }}</td>
            <td v-for="c in kolom" :key="c.id" :class="[td, diBawah(r.nilai[c.id] ?? null) ? 'text-error font-semibold' : '']" class="text-right tabular-nums">
              {{ angka(r.nilai[c.id]) }}
            </td>
            <td v-if="!kolom.length" :class="td" />
            <td :class="td" class="text-center">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-label-sm whitespace-nowrap" :class="STATUS[r.status].cls">
                <span class="material-symbols-outlined" style="font-size: 14px">{{ STATUS[r.status].icon }}</span>
                {{ STATUS[r.status].label }}
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length" class="bg-surface-container-low font-semibold border-t-2 border-[#0b4a8b]">
          <tr>
            <td :class="td" colspan="3">Rerata</td>
            <td v-for="c in kolom" :key="c.id" :class="td" class="text-right tabular-nums">{{ angka(rerata[c.id]) }}</td>
            <td v-if="!kolom.length" :class="td" />
            <td :class="td" />
          </tr>
        </tfoot>
      </table>
    </div>

    <section class="text-body-sm">
      <p class="font-semibold mb-1">Keterangan:</p>
      <p>
        {{ jumlah.SUDAH }} mahasiswa sudah memenuhi target CPMK ({{ angka(mataKuliah.targetCpmk) }}), {{ jumlah.BELUM }} belum memenuhi, {{ jumlah.BELUM_DINILAI }} belum dinilai.
      </p>
      <p class="text-on-surface-variant">Sudah Memenuhi = semua CPMK mencapai target. Nilai merah = di bawah target. Target CPMK diatur di Setting Kurikulum.</p>
    </section>
  </div>
</template>
