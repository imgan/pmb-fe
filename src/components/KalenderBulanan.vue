<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { KATEGORI_BY, KATEGORI_KALENDER, NAMA_BULAN, rentangTanggal, warnaTeksKategori, ymd, type KegiatanKalender } from '@/api/kalenderAkademik';

/**
 * Kalender bulanan kegiatan akademik (minggu dimulai Senin) + kotak "Warna Kegiatan". Dipakai
 * BAAK (bisa klik tanggal/kegiatan) dan portal mahasiswa (hanya lihat). `resetKey` berubah (mis.
 * ganti tahun akademik) → bulan diarahkan ke bulan yang berisi kegiatan.
 */
const props = defineProps<{
  items: KegiatanKalender[];
  loading?: boolean;
  /** Tanggal bisa diklik (mis. untuk tambah kegiatan). */
  tanggalBisaDiklik?: boolean;
  resetKey?: string | number;
  kosongPesan?: string;
}>();
const emit = defineEmits<{ tanggal: [tgl: string]; kegiatan: [k: KegiatanKalender]; lainnya: [tgl: string] }>();

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MAKS_PER_SEL = 3;
const hariIni = ymd(new Date());
const pad = (n: number) => String(n).padStart(2, '0');

const bulan = ref(new Date().getMonth());
const tahun = ref(new Date().getFullYear());
const geserBulan = (n: number) => {
  const d = new Date(tahun.value, bulan.value + n, 1);
  bulan.value = d.getMonth();
  tahun.value = d.getFullYear();
};
const keHariIni = () => {
  bulan.value = new Date().getMonth();
  tahun.value = new Date().getFullYear();
};

/** 6 minggu × 7 hari. */
const sel = computed(() => {
  const awal = new Date(tahun.value, bulan.value, 1);
  const mulai = new Date(tahun.value, bulan.value, 1 - ((awal.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate() + i);
    const tgl = ymd(d);
    return {
      tgl,
      hari: d.getDate(),
      bulanIni: d.getMonth() === bulan.value,
      minggu: d.getDay() === 0,
      kegiatan: props.items.filter((k) => k.tanggalMulai <= tgl && k.tanggalSelesai >= tgl),
    };
  });
});

// Bulan awal: tetap di bulan ini bila ada kegiatan, selain itu bulan kegiatan pertama.
const aturBulanAwal = () => {
  const bulanIni = `${tahun.value}-${pad(bulan.value + 1)}`;
  if (!props.items.length || props.items.some((k) => k.tanggalMulai.slice(0, 7) <= bulanIni && k.tanggalSelesai.slice(0, 7) >= bulanIni)) return;
  const [y, m] = props.items[0].tanggalMulai.split('-').map(Number);
  tahun.value = y;
  bulan.value = m - 1;
};
let menungguReset = true;
watch(
  () => props.resetKey,
  () => (menungguReset = true)
);
watch(
  () => props.items,
  () => {
    // Tunggu sampai data periode baru benar-benar ada (data awal masih kosong saat dimuat).
    if (!menungguReset || props.loading || !props.items.length) return;
    menungguReset = false;
    aturBulanAwal();
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 flex flex-wrap items-center gap-2 border-b border-outline-variant">
        <button
          type="button"
          class="w-9 h-9 rounded-md border border-outline-variant hover:bg-surface-container flex items-center justify-center"
          title="Bulan sebelumnya"
          @click="geserBulan(-1)"
        >
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 class="w-48 text-center text-title-md font-semibold text-on-surface">{{ NAMA_BULAN[bulan] }} {{ tahun }}</h2>
        <button
          type="button"
          class="w-9 h-9 rounded-md border border-outline-variant hover:bg-surface-container flex items-center justify-center"
          title="Bulan berikutnya"
          @click="geserBulan(1)"
        >
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
        <AppButton variant="secondary" @click="keHariIni">Hari ini</AppButton>
      </div>

      <div class="overflow-x-auto">
        <div class="min-w-[720px]">
          <div class="grid grid-cols-7 bg-surface-container text-label-md text-on-surface-variant">
            <div v-for="(h, i) in HARI" :key="h" class="px-2 py-2 text-center font-medium" :class="i === 6 ? 'text-error' : ''">{{ h }}</div>
          </div>
          <div class="grid grid-cols-7">
            <div
              v-for="c in sel"
              :key="c.tgl"
              class="min-h-[112px] border-t border-l border-outline-variant p-1.5 flex flex-col gap-1 [&:nth-child(7n+1)]:border-l-0"
              :class="[c.bulanIni ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60', tanggalBisaDiklik ? 'cursor-pointer hover:bg-surface-container-low' : '']"
              @click="tanggalBisaDiklik && emit('tanggal', c.tgl)"
            >
              <span
                class="self-end w-7 h-7 flex items-center justify-center rounded-full text-label-md tabular-nums"
                :class="[c.tgl === hariIni ? 'bg-primary text-on-primary font-semibold' : '', !c.bulanIni ? 'text-outline' : c.minggu ? 'text-error' : 'text-on-surface']"
              >
                {{ c.hari }}
              </span>
              <button
                v-for="k in c.kegiatan.slice(0, MAKS_PER_SEL)"
                :key="k.id"
                type="button"
                class="w-full text-left truncate rounded px-1.5 py-0.5 text-label-sm font-medium hover:opacity-90"
                :style="{ background: KATEGORI_BY[k.kategori].color, color: warnaTeksKategori(KATEGORI_BY[k.kategori].color) }"
                :title="`${k.namaKegiatan} (${KATEGORI_BY[k.kategori].label}) · ${rentangTanggal(k)}`"
                @click.stop="emit('kegiatan', k)"
              >
                {{ k.namaKegiatan }}
              </button>
              <button
                v-if="c.kegiatan.length > MAKS_PER_SEL"
                type="button"
                class="text-left px-1.5 text-label-sm text-primary hover:underline"
                @click.stop="emit('lainnya', c.tgl)"
              >
                +{{ c.kegiatan.length - MAKS_PER_SEL }} lainnya
              </button>
            </div>
          </div>
        </div>
      </div>
      <p v-if="loading" class="p-3 text-center text-body-sm text-on-surface-variant">Memuat...</p>
      <p v-else-if="!items.length" class="p-3 text-center text-body-sm text-on-surface-variant">{{ kosongPesan ?? 'Belum ada kegiatan.' }}</p>
    </section>

    <section class="mt-6 bg-surface-container-lowest border border-outline-variant border-l-4 border-l-primary rounded-lg p-4">
      <h3 class="text-label-md font-semibold text-primary mb-3">Warna Kegiatan</h3>
      <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-body-sm text-on-surface">
        <li v-for="k in KATEGORI_KALENDER" :key="k.value" class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-sm shrink-0 border border-outline-variant" :style="{ background: k.color }"></span>{{ k.label }}
        </li>
      </ul>
    </section>
  </div>
</template>
