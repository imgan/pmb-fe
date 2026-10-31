<script setup lang="ts">
import type { DashboardDosen, IndeksKepuasan } from '@/api/dosenPortal';

/**
 * Statistik dashboard dosen: tiga kartu ringkasan (mahasiswa aktif, kehadiran mengajar, kelulusan)
 * dengan cincin persentase, indeks kepuasan (skala 0–4), dan jumlah mahasiswa per prodi per status.
 */
const props = defineProps<{ data: DashboardDosen }>();

const R = 30;
const KELILING = 2 * Math.PI * R;
const dash = (persen: number) => `${(Math.min(Math.max(persen, 0), 100) / 100) * KELILING} ${KELILING}`;
const fmtPersen = (v: number) => `${v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const tiles = () => [
  {
    label: 'Mahasiswa Aktif',
    nilai: props.data.ringkasan.mahasiswaAktif.toLocaleString('id-ID'),
    persen: props.data.ringkasan.persenAktif,
    catatan: `dari ${props.data.statistikProdi.total.jumlah.toLocaleString('id-ID')} mahasiswa`,
  },
  {
    label: 'Kehadiran Anda',
    nilai: fmtPersen(props.data.ringkasan.kehadiran.persen),
    persen: props.data.ringkasan.kehadiran.persen,
    catatan: props.data.ringkasan.kehadiran.target
      ? `${props.data.ringkasan.kehadiran.hadir} dari ${props.data.ringkasan.kehadiran.target} pertemuan (${props.data.ringkasan.kehadiran.jumlahKelas} kelas × 16)`
      : 'Belum ada kelas diampu semester ini',
  },
  {
    label: 'Kelulusan',
    nilai: props.data.ringkasan.lulusan.toLocaleString('id-ID'),
    persen: props.data.ringkasan.persenLulus,
    catatan: 'mahasiswa sudah yudisium',
  },
];

const KATEGORI_KEPUASAN = [
  { min: 3.3, label: 'Sangat Puas' },
  { min: 2.5, label: 'Puas' },
  { min: 1.7, label: 'Cukup Puas' },
  { min: 0.9, label: 'Tidak Puas' },
  { min: 0, label: 'Sangat Tidak Puas' },
];
const kategori = (indeks: number) => KATEGORI_KEPUASAN.find((k) => indeks >= k.min)?.label ?? '-';
const kepuasan = (): { label: string; sumber: string; data: IndeksKepuasan }[] => [
  { label: 'Indeks Kepuasan Mahasiswa', sumber: 'Angket Pelayanan', data: props.data.kepuasan.mahasiswa },
  { label: 'Indeks Kepuasan Dosen', sumber: 'EDOM', data: props.data.kepuasan.dosen },
  { label: 'Indeks Kepuasan Pembimbingan', sumber: 'Evaluasi pembimbingan', data: props.data.kepuasan.pembimbingan },
];

const KOLOM = [
  { key: 'jumlah', label: 'Jumlah' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'cuti', label: 'Cuti' },
  { key: 'nonAktif', label: 'Non-Aktif' },
  { key: 'lulus', label: 'Lulus' },
  { key: 'dikeluarkan', label: 'Dikeluarkan' },
  { key: 'mengundurkanDiri', label: 'Mengundurkan Diri' },
] as const;
</script>

<template>
  <div class="space-y-6 mb-6">
    <!-- Kartu ringkasan -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="t in tiles()"
        :key="t.label"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex items-center gap-4"
      >
        <div class="flex-1 min-w-0">
          <p class="text-label-md text-on-surface-variant">{{ t.label }}</p>
          <p class="text-headline-md font-semibold text-on-surface tabular-nums">{{ t.nilai }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ t.catatan }}</p>
        </div>
        <svg viewBox="0 0 80 80" class="w-20 h-20 shrink-0" role="img" :aria-label="`${t.label} ${fmtPersen(t.persen)}`">
          <circle cx="40" cy="40" :r="R" fill="none" stroke="currentColor" stroke-width="8" class="text-surface-container-highest" />
          <circle
            cx="40"
            cy="40"
            :r="R"
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="dash(t.persen)"
            transform="rotate(-90 40 40)"
            class="text-primary"
          />
          <text x="40" y="44" text-anchor="middle" class="fill-on-surface" style="font-size: 12px; font-weight: 600">
            {{ Math.round(t.persen) }}%
          </text>
        </svg>
      </div>
    </section>

    <!-- Indeks kepuasan -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 md:p-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="k in kepuasan()" :key="k.label">
          <p class="text-label-md font-semibold text-on-surface uppercase tracking-wide">{{ k.label }}</p>
          <p class="text-label-sm text-on-surface-variant mb-2">
            <template v-if="k.data.indeks !== null">
              {{ k.data.indeks.toLocaleString('id-ID') }} dari 4 · {{ kategori(k.data.indeks) }} · {{ k.data.responden }} responden
            </template>
            <template v-else>Belum ada data ({{ k.sumber }})</template>
          </p>
          <div class="h-3 rounded-full bg-surface-container-highest overflow-hidden" role="meter" :aria-valuenow="k.data.indeks ?? 0" aria-valuemin="0" aria-valuemax="4">
            <div class="h-full rounded-full bg-primary" :style="{ width: `${((k.data.indeks ?? 0) / 4) * 100}%` }" />
          </div>
        </div>
      </div>
      <p class="mt-4 text-label-sm text-on-surface-variant">
        Skala: Sangat Tidak Puas (0–0,8) · Tidak Puas (0,9–1,6) · Cukup Puas (1,7–2,4) · Puas (2,5–3,2) · Sangat Puas (3,3–4)
      </p>
    </section>

    <!-- Status mahasiswa per prodi -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 border-b border-outline-variant">
        <h2 class="font-semibold text-title-md text-primary">
          Jumlah Mahasiswa Berdasarkan Status Aktivitas Mahasiswa (AKM)<template v-if="data.tahunAjaran"> Periode {{ data.tahunAjaran }}</template>
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-surface-container text-label-md text-on-surface-variant">
            <tr>
              <th class="px-4 py-2 text-left font-medium">Program Studi</th>
              <th v-for="c in KOLOM" :key="c.key" class="px-4 py-2 text-right font-medium whitespace-nowrap">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="p in data.statistikProdi.prodi" :key="p.prodi">
              <td class="px-4 py-2 text-on-surface">{{ p.prodi }}</td>
              <td v-for="c in KOLOM" :key="c.key" class="px-4 py-2 text-right tabular-nums">{{ p[c.key].toLocaleString('id-ID') }}</td>
            </tr>
          </tbody>
          <tfoot class="border-t border-outline-variant font-semibold text-on-surface">
            <tr>
              <td class="px-4 py-2">Total</td>
              <td v-for="c in KOLOM" :key="c.key" class="px-4 py-2 text-right tabular-nums">{{ data.statistikProdi.total[c.key].toLocaleString('id-ID') }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>
