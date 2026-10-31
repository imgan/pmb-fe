<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { notifikasiApi, type Notifikasi, type TipeNotifikasi } from '@/api/notifikasi';

/**
 * Lonceng notifikasi di header portal (pojok kanan atas): chat baru, komentar / pertanyaan mahasiswa, pengumpulan
 * tugas (dosen); konten baru, balasan komentar, nilai tugas (mahasiswa). Diperbarui tiap 60 detik; membuka panel
 * menandai notifikasi sudah dibaca (chat tetap baru sampai pesannya dibuka). Klik notifikasi → halaman terkait.
 */
const props = defineProps<{ portal: 'dosen' | 'mahasiswa' }>();
const api = notifikasiApi[props.portal];
const router = useRouter();

const items = ref<Notifikasi[]>([]);
const belum = ref(0);
const terbuka = ref(false);
const memuat = ref(false);
const akar = ref<HTMLElement | null>(null);

const muat = async () => {
  try {
    const d = await api.daftar();
    items.value = d.items;
    belum.value = d.belumDibaca;
  } catch {
    // Gagal memuat (mis. sesi habis) — lonceng tetap tampil tanpa angka.
  }
};
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  muat();
  timer = setInterval(() => document.visibilityState === 'visible' && !terbuka.value && muat(), 60000);
  document.addEventListener('mousedown', tutupLuar);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener('mousedown', tutupLuar);
});
const tutupLuar = (e: MouseEvent) => {
  if (terbuka.value && akar.value && !akar.value.contains(e.target as Node)) terbuka.value = false;
};

const toggle = async () => {
  terbuka.value = !terbuka.value;
  if (!terbuka.value) return;
  memuat.value = true;
  await muat();
  memuat.value = false;
  // Tanda "baru" tetap terlihat selama panel terbuka; angka lonceng diperbarui dari server.
  if (items.value.some((n) => n.baru && n.tipe !== 'CHAT')) {
    api
      .baca()
      .then((d) => (belum.value = d.belumDibaca))
      .catch(() => undefined);
  }
};
const buka = (n: Notifikasi) => {
  terbuka.value = false;
  router.push(n.tautan);
};

const IKON: Record<TipeNotifikasi, { icon: string; kelas: string }> = {
  CHAT: { icon: 'chat', kelas: 'bg-[#059669]/12 text-[#047857]' },
  KOMENTAR: { icon: 'forum', kelas: 'bg-[#2563eb]/10 text-[#1e40af]' },
  TUGAS: { icon: 'assignment_turned_in', kelas: 'bg-[#d97706]/12 text-[#92400e]' },
  KONTEN: { icon: 'library_books', kelas: 'bg-[#7c3aed]/10 text-[#5b21b6]' },
  NILAI: { icon: 'grading', kelas: 'bg-[#d83b3b]/10 text-[#a32020]' },
};
const relatif = (iso: string) => {
  const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return hari === 1 ? 'kemarin' : `${hari} hari lalu`;
};
</script>

<template>
  <div ref="akar" class="relative">
    <button
      type="button"
      class="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-on-primary/10 transition-colors"
      :title="belum ? `${belum} notifikasi baru` : 'Notifikasi'"
      :aria-label="belum ? `${belum} notifikasi baru` : 'Notifikasi'"
      @click="toggle"
    >
      <span class="material-symbols-outlined" :style="{ fontSize: '24px', fontVariationSettings: belum ? `'FILL' 1` : `'FILL' 0` }">notifications</span>
      <span
        v-if="belum"
        class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d83b3b] text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-primary"
      >
        {{ belum > 99 ? '99+' : belum }}
      </span>
    </button>

    <div
      v-if="terbuka"
      class="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface shadow-[0px_12px_32px_rgba(27,54,93,0.18)] z-50 overflow-hidden"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <p class="font-semibold">Notifikasi</p>
        <span class="text-label-sm text-on-surface-variant">30 hari terakhir</span>
      </div>
      <div class="max-h-[26rem] overflow-y-auto">
        <p v-if="memuat && !items.length" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</p>
        <div v-else-if="!items.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          <span class="material-symbols-outlined block mb-1" style="font-size: 32px">notifications_off</span>
          Belum ada notifikasi.
        </div>
        <button
          v-for="n in items"
          :key="n.kunci"
          type="button"
          class="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors"
          :class="{ 'bg-primary-container/25': n.baru }"
          @click="buka(n)"
        >
          <span class="mt-0.5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center" :class="IKON[n.tipe].kelas">
            <span class="material-symbols-outlined" style="font-size: 19px">{{ IKON[n.tipe].icon }}</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-body-sm leading-snug" :class="n.baru ? 'font-semibold' : ''">{{ n.judul }}</span>
            <span v-if="n.isi" class="block text-label-sm text-on-surface-variant truncate">{{ n.isi }}</span>
            <span class="block text-[11px] text-on-surface-variant mt-0.5">{{ relatif(n.waktu) }}</span>
          </span>
          <span v-if="n.baru" class="mt-2 w-2 h-2 shrink-0 rounded-full bg-[#2563eb]" aria-label="belum dibaca" />
        </button>
      </div>
    </div>
  </div>
</template>
