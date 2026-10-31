<script setup lang="ts">
import { computed } from 'vue';
import type { KonteksLaporanObe } from '@/api/laporanObe';
import LaporanObeKepala from './LaporanObeKepala.vue';

/**
 * Laporan OBE → CPL per Mahasiswa: kepala laporan, daftar CPL program studi, tabel nilai CPL tiap mahasiswa
 * (mahasiswa yang mengambil MK kurikulum tapi belum dinilai tampil "-") + rerata, dan keterangan hasil.
 */
const props = defineProps<{
  konteks: KonteksLaporanObe & { jumlahDinilai?: number };
  kolom: { id: number; kode: string; deskripsi: string; target: number | null }[];
  rows: { id: number; nim: string; nama: string; angkatan: number; nilai: Record<string, number | null> }[];
  rerata: Record<string, number | null>;
}>();

const angka = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// Keterangan hasil: CPL dengan rerata tertinggi / terendah dan rata-rata keseluruhan.
const dinilai = computed(() => props.kolom.filter((k) => props.rerata[k.id] !== null && props.rerata[k.id] !== undefined));
const tertinggi = computed(() => dinilai.value.reduce<(typeof props.kolom)[number] | null>((a, k) => (!a || (props.rerata[k.id] ?? 0) > (props.rerata[a.id] ?? 0) ? k : a), null));
const terendah = computed(() => dinilai.value.reduce<(typeof props.kolom)[number] | null>((a, k) => (!a || (props.rerata[k.id] ?? 0) < (props.rerata[a.id] ?? 0) ? k : a), null));
const rataKeseluruhan = computed(() => (dinilai.value.length ? dinilai.value.reduce((s, k) => s + (props.rerata[k.id] ?? 0), 0) / dinilai.value.length : null));
const diBawahTarget = (k: (typeof props.kolom)[number], v: number | null) => k.target !== null && v !== null && v < k.target;

const th = 'px-3 py-2.5 border border-white/25 font-semibold';
const td = 'px-3 py-2 border border-outline-variant';
</script>

<template>
  <div class="space-y-5">
    <LaporanObeKepala judul="CPL PER MAHASISWA" :konteks="konteks" />

    <!-- Daftar CPL -->
    <section class="border border-outline-variant rounded-lg p-5 bg-surface-container-lowest">
      <h3 class="font-semibold text-on-surface mb-3">CPL Program Studi - {{ konteks.prodi }}</h3>
      <p v-if="!kolom.length" class="text-body-sm text-on-surface-variant">Kurikulum ini belum memiliki CPL.</p>
      <dl class="space-y-2 text-body-sm">
        <div v-for="k in kolom" :key="k.id" class="grid grid-cols-[6rem_1fr] gap-3">
          <dt class="font-medium before:content-['•'] before:mr-2">{{ k.kode }}</dt>
          <dd>{{ k.deskripsi }}</dd>
        </div>
      </dl>
    </section>

    <!-- Nilai CPL per mahasiswa -->
    <div class="overflow-x-auto border border-outline-variant rounded-lg">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-[#0b4a8b] text-white">
          <tr>
            <th rowspan="2" :class="th" class="w-12 text-center">No.</th>
            <th rowspan="2" :class="th" class="text-left">NIM</th>
            <th rowspan="2" :class="th" class="text-left min-w-[12rem]">Nama Mahasiswa</th>
            <th :colspan="Math.max(kolom.length, 1)" :class="th" class="text-center">Nilai CPL</th>
          </tr>
          <tr>
            <th v-for="k in kolom" :key="k.id" :class="th" class="text-center min-w-[4.5rem]" :title="k.target !== null ? `Target ${angka(k.target)}` : 'Target belum diisi'">{{ k.kode }}</th>
            <th v-if="!kolom.length" :class="th" />
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td :colspan="kolom.length + 3" :class="td" class="p-6 text-center text-on-surface-variant">Belum ada mahasiswa yang mengambil mata kuliah kurikulum ini.</td>
          </tr>
          <tr v-for="(r, i) in rows" :key="r.id">
            <td :class="td" class="text-center">{{ i + 1 }}.</td>
            <td :class="td" class="whitespace-nowrap">{{ r.nim }}</td>
            <td :class="td">{{ r.nama }}</td>
            <td
              v-for="k in kolom"
              :key="k.id"
              :class="[td, diBawahTarget(k, r.nilai[k.id] ?? null) ? 'text-error font-semibold' : '']"
              class="text-right tabular-nums"
              :title="diBawahTarget(k, r.nilai[k.id] ?? null) ? `Di bawah target (${angka(k.target)})` : undefined"
            >
              {{ angka(r.nilai[k.id]) }}
            </td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length" class="bg-surface-container-low font-semibold border-t-2 border-[#0b4a8b]">
          <tr>
            <td :class="td" colspan="3">Rerata Nilai CPL</td>
            <td v-for="k in kolom" :key="k.id" :class="td" class="text-right tabular-nums">{{ angka(rerata[k.id]) }}</td>
          </tr>
          <tr class="font-normal text-on-surface-variant">
            <td :class="td" colspan="3">Target</td>
            <td v-for="k in kolom" :key="k.id" :class="td" class="text-right tabular-nums">{{ angka(k.target) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Keterangan -->
    <section class="text-body-sm">
      <p class="font-semibold mb-1">Keterangan Hasil CPL:</p>
      <template v-if="tertinggi && terendah">
        <p>
          Capaian Pembelajaran Lulusan (CPL) mencatat capaian tertinggi sebesar {{ angka(rerata[tertinggi.id]) }} ({{ tertinggi.kode }}), dengan batas terendah pada angka
          {{ angka(rerata[terendah.id]) }} ({{ terendah.kode }}).
        </p>
        <p>Secara keseluruhan, rata-rata CPL berada pada angka {{ angka(rataKeseluruhan) }}.</p>
      </template>
      <p v-else>Belum ada nilai CPL yang bisa dihitung.</p>
      <p class="mt-1 text-on-surface-variant">
        Rerata dihitung dari {{ konteks.jumlahDinilai ?? konteks.jumlahMahasiswa }} mahasiswa yang sudah dinilai; mahasiswa bertanda "-" belum memiliki nilai OBE. Nilai merah = di bawah target.
      </p>
    </section>
  </div>
</template>
