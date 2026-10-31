<script setup lang="ts">
import { computed, ref } from 'vue';
import type { KonteksLaporanObe, StatistikCapaian } from '@/api/laporanObe';
import LaporanObeKepala from './LaporanObeKepala.vue';

/**
 * Laporan OBE → CPL per Program Studi: kepala laporan (logo + info), spiderchart capaian vs target CPL,
 * performa (CPL tertinggi / terendah) dan tabel detail (nilai CPL + ketercapaian mahasiswa).
 */
type Baris = StatistikCapaian & { id: number; kode: string; deskripsi: string; mhsBelum: number | null; mhsSudah: number | null };
const props = defineProps<{ konteks: KonteksLaporanObe; rows: Baris[] }>();

const angka = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// ---- Performa ----
const dinilai = computed(() => props.rows.filter((r) => r.rerata !== null));
const tertinggi = computed(() => dinilai.value.reduce<Baris | null>((a, r) => (!a || (r.rerata ?? 0) > (a.rerata ?? 0) ? r : a), null));
const terendah = computed(() => dinilai.value.reduce<Baris | null>((a, r) => (!a || (r.rerata ?? 0) < (a.rerata ?? 0) ? r : a), null));

// ---- Spiderchart (skala 0–100) ----
const UKURAN = 360;
const PUSAT = UKURAN / 2;
const JARI = 120;
const CINCIN = [20, 40, 60, 80, 100];
const sudut = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / Math.max(props.rows.length, 1);
const titik = (i: number, nilai: number, r = JARI) => {
  const k = (Math.max(0, Math.min(100, nilai)) / 100) * r;
  return { x: PUSAT + k * Math.cos(sudut(i)), y: PUSAT + k * Math.sin(sudut(i)) };
};
const poligon = (nilai: (number | null)[]) => nilai.map((v, i) => titik(i, v ?? 0)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const cincin = (n: number) => props.rows.map((_, i) => titik(i, n)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const label = (i: number) => {
  const p = titik(i, 100, JARI + 26);
  const cos = Math.cos(sudut(i));
  return { ...p, anchor: Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end' };
};
const capaian = computed(() => props.rows.map((r) => r.rerata));
const target = computed(() => props.rows.map((r) => r.target));

// Tooltip titik capaian.
const hover = ref<number | null>(null);
const hoverPos = computed(() => (hover.value === null ? null : titik(hover.value, props.rows[hover.value].rerata ?? 0)));

const STATUS = {
  sudah: { label: 'Sudah Memenuhi', icon: 'check_circle', cls: 'border-[#059669]/40 bg-[#059669]/10 text-[#05603a]' },
  belum: { label: 'Belum Memenuhi', icon: 'cancel', cls: 'border-error/40 bg-error-container/50 text-on-error-container' },
  kosong: { label: 'Belum Dinilai', icon: 'remove', cls: 'border-outline-variant bg-surface-container text-on-surface-variant' },
  tanpaTarget: { label: 'Target Belum Diisi', icon: 'help', cls: 'border-outline-variant bg-surface-container text-on-surface-variant' },
} as const;
const statusOf = (r: Baris) => (r.rerata === null ? STATUS.kosong : r.tercapai === null ? STATUS.tanpaTarget : r.tercapai ? STATUS.sudah : STATUS.belum);

const th = 'px-3 py-2.5 border border-white/25 font-semibold';
const td = 'px-3 py-2.5 border border-outline-variant';
</script>

<template>
  <div class="space-y-5">
    <LaporanObeKepala judul="CPL PER PROGRAM STUDI" :konteks="konteks" />

    <!-- Spiderchart + performa -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center border border-outline-variant rounded-lg p-5 bg-surface-container-lowest">
      <figure class="m-0">
        <figcaption class="font-semibold text-on-surface mb-2 text-center">Spiderchart CPL Program Studi</figcaption>
        <div v-if="rows.length < 3" class="p-6 text-center text-body-sm text-on-surface-variant">Spiderchart membutuhkan minimal 3 CPL (saat ini {{ rows.length }}). Lihat tabel detail di bawah.</div>
        <div v-else class="relative mx-auto max-w-[420px]">
          <svg :viewBox="`-40 -10 ${UKURAN + 80} ${UKURAN + 20}`" class="w-full h-auto" role="img" :aria-label="`Spiderchart capaian CPL: ${rows.map((r) => `${r.kode} ${angka(r.rerata)}`).join(', ')}`">
            <!-- Grid: cincin & jari-jari (resesif) -->
            <polygon v-for="n in CINCIN" :key="n" :points="cincin(n)" fill="none" stroke="currentColor" class="text-outline-variant" stroke-width="1" />
            <line v-for="(_, i) in rows" :key="`j${i}`" :x1="PUSAT" :y1="PUSAT" :x2="titik(i, 100).x" :y2="titik(i, 100).y" stroke="currentColor" class="text-outline-variant" stroke-width="1" />
            <!-- Target (putus-putus) lalu capaian -->
            <polygon :points="poligon(target)" fill="#d97706" fill-opacity="0.12" stroke="#d97706" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" />
            <polygon :points="poligon(capaian)" fill="#2563eb" fill-opacity="0.22" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" />
            <!-- Titik capaian + area hover yang lebih besar dari titiknya -->
            <g v-for="(r, i) in rows" :key="`t${r.id}`">
              <circle :cx="titik(i, r.rerata ?? 0).x" :cy="titik(i, r.rerata ?? 0).y" r="4" fill="#2563eb" stroke="var(--color-surface-container-lowest, #fff)" stroke-width="2" />
              <circle
                :cx="titik(i, r.rerata ?? 0).x"
                :cy="titik(i, r.rerata ?? 0).y"
                r="14"
                fill="transparent"
                class="cursor-pointer"
                @mouseenter="hover = i"
                @mouseleave="hover = null"
                @focus="hover = i"
                @blur="hover = null"
                tabindex="0"
              />
            </g>
            <!-- Label sumbu: kode + nilai (warna teks, bukan warna seri) -->
            <text
              v-for="(r, i) in rows"
              :key="`l${r.id}`"
              :x="label(i).x"
              :y="label(i).y"
              :text-anchor="label(i).anchor"
              class="fill-on-surface"
              font-size="12"
            >
              <tspan :x="label(i).x" dy="-0.2em" font-weight="600">{{ r.kode }}</tspan>
              <tspan :x="label(i).x" dy="1.2em" class="fill-on-surface-variant">{{ r.rerata === null ? 'belum dinilai' : angka(r.rerata) }}</tspan>
            </text>
          </svg>
          <div
            v-if="hover !== null && hoverPos"
            class="absolute pointer-events-none z-10 px-3 py-2 rounded-md shadow-lg bg-inverse-surface text-inverse-on-surface text-label-sm whitespace-nowrap -translate-x-1/2 -translate-y-full"
            :style="{ left: `${((hoverPos.x + 40) / (UKURAN + 80)) * 100}%`, top: `${((hoverPos.y + 10) / (UKURAN + 20)) * 100 - 3}%` }"
          >
            <p class="font-semibold">{{ rows[hover].kode }}</p>
            <p>Capaian: {{ angka(rows[hover].rerata) }}</p>
            <p>Target: {{ angka(rows[hover].target) }}</p>
          </div>
          <!-- Legenda -->
          <div class="flex justify-center gap-5 text-label-sm text-on-surface-variant mt-1">
            <span class="inline-flex items-center gap-1.5"><span class="w-5 h-3 rounded-sm border-2 border-[#2563eb] bg-[#2563eb]/25" /> Capaian</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-5 h-3 rounded-sm border-2 border-dashed border-[#d97706] bg-[#d97706]/10" /> Target</span>
          </div>
        </div>
      </figure>

      <div>
        <h3 class="font-semibold text-on-surface mb-3">Performa CPL Program Studi</h3>
        <div class="inline-grid grid-cols-2 rounded-lg bg-surface-container overflow-hidden">
          <div class="px-6 py-4 border-r border-outline-variant">
            <p class="text-label-md font-semibold text-on-surface">CPL Tertinggi</p>
            <p class="text-[2rem] leading-tight font-bold text-[#05603a] tabular-nums">{{ angka(tertinggi?.rerata) }}</p>
            <p class="text-label-sm text-on-surface-variant">{{ tertinggi ? `di posisi ${tertinggi.kode}` : 'belum ada nilai' }}</p>
          </div>
          <div class="px-6 py-4">
            <p class="text-label-md font-semibold text-on-surface">CPL Terendah</p>
            <p class="text-[2rem] leading-tight font-bold text-error tabular-nums">{{ angka(terendah?.rerata) }}</p>
            <p class="text-label-sm text-on-surface-variant">{{ terendah ? `di posisi ${terendah.kode}` : 'belum ada nilai' }}</p>
          </div>
        </div>
        <p v-if="tertinggi && terendah" class="mt-3 text-body-sm italic text-on-surface-variant max-w-md">
          CPL mencatat rerata tertinggi sebesar {{ angka(tertinggi.rerata) }} ({{ tertinggi.kode }}), dengan batas terendah pada angka {{ angka(terendah.rerata) }} ({{ terendah.kode }}).
        </p>
        <p v-if="dinilai.length < rows.length" class="mt-2 text-body-sm text-on-surface-variant">{{ rows.length - dinilai.length }} CPL belum dinilai.</p>
      </div>
    </section>

    <!-- Detail -->
    <section>
      <h3 class="font-semibold text-on-surface mb-2">Detail Deskripsi dan Hasil Setiap CPL Program Studi</h3>
      <div class="overflow-x-auto border border-outline-variant rounded-lg">
        <table class="w-full text-body-sm border-collapse">
          <thead class="bg-[#0b4a8b] text-white">
            <tr>
              <th rowspan="2" :class="th" class="text-center w-24">Kode CPL</th>
              <th rowspan="2" :class="th" class="text-left min-w-[18rem]">Deskripsi CPL</th>
              <th colspan="3" :class="th" class="text-center">Nilai CPL</th>
              <th colspan="2" :class="th" class="text-center">Ketercapaian Mhs</th>
            </tr>
            <tr>
              <th :class="th" class="text-right w-20">Target</th>
              <th :class="th" class="text-right w-20">Rerata</th>
              <th :class="th" class="text-center w-40">Status</th>
              <th :class="th" class="text-right w-20">Belum</th>
              <th :class="th" class="text-right w-20">Sudah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td colspan="7" :class="td" class="p-6 text-center text-on-surface-variant">Kurikulum ini belum memiliki CPL.</td>
            </tr>
            <tr v-for="r in rows" :key="r.id" class="align-top">
              <td :class="td" class="text-center font-medium">{{ r.kode }}</td>
              <td :class="td">{{ r.deskripsi }}</td>
              <td :class="td" class="text-right tabular-nums">{{ angka(r.target) }}</td>
              <td :class="td" class="text-right tabular-nums font-semibold">{{ angka(r.rerata) }}</td>
              <td :class="td" class="text-center">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-label-sm whitespace-nowrap" :class="statusOf(r).cls">
                  <span class="material-symbols-outlined" style="font-size: 14px">{{ statusOf(r).icon }}</span>
                  {{ statusOf(r).label }}
                </span>
              </td>
              <td :class="td" class="text-right tabular-nums">{{ r.mhsBelum ?? '-' }}</td>
              <td :class="td" class="text-right tabular-nums">{{ r.mhsSudah ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
