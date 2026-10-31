<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { LampiranPesan, ObrolanApi } from '@/api/elearningSosial';
import { dataUrlToBlob, downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/**
 * Lampiran satu pesan obrolan: gambar dimuat otomatis (dan disimpan di cache selama halaman terbuka) lalu tampil sebagai
 * pratinjau; file lain tampil sebagai kartu nama + ukuran dengan tombol unduh.
 */
const props = defineProps<{ api: ObrolanApi; obrolanId: number; pesanId: number; lampiran: LampiranPesan; saya: boolean }>();

const cache = (globalThis as unknown as { __lampiranObrolan?: Map<number, string> }).__lampiranObrolan ?? new Map<number, string>();
(globalThis as unknown as { __lampiranObrolan?: Map<number, string> }).__lampiranObrolan = cache;

const gambar = computed(() => !!props.lampiran.tipe?.startsWith('image/'));
const src = ref<string | null>(cache.get(props.pesanId) ?? null);
const gagal = ref(false);
const mengunduh = ref(false);

const ambil = async () => {
  if (cache.has(props.pesanId)) return cache.get(props.pesanId)!;
  const r = await props.api.lampiran(props.obrolanId, props.pesanId);
  cache.set(props.pesanId, r.lampiran);
  return r.lampiran;
};
onMounted(async () => {
  if (!gambar.value || src.value) return;
  try {
    src.value = await ambil();
  } catch {
    gagal.value = true;
  }
});
const unduh = async () => {
  mengunduh.value = true;
  try {
    downloadBlob(dataUrlToBlob(await ambil()), props.lampiran.nama);
  } catch {
    toastError('Gagal mengunduh lampiran');
  } finally {
    mengunduh.value = false;
  }
};
const bukaGambar = () => src.value && window.open(URL.createObjectURL(dataUrlToBlob(src.value)), '_blank', 'noopener');
const ukuran = computed(() => {
  const b = props.lampiran.ukuran;
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
});
const ikon = computed(() => {
  const t = props.lampiran.tipe ?? '';
  if (t.includes('pdf')) return 'picture_as_pdf';
  if (t.includes('sheet') || t.includes('excel')) return 'table_chart';
  if (t.includes('word') || t.includes('document')) return 'description';
  if (t.includes('presentation') || t.includes('powerpoint')) return 'slideshow';
  if (t.includes('zip') || t.includes('compressed')) return 'folder_zip';
  return 'attach_file';
});
</script>

<template>
  <div v-if="gambar" class="mb-1">
    <button v-if="src" type="button" class="block" title="Buka gambar" @click="bukaGambar">
      <img :src="src" :alt="lampiran.nama" class="max-h-60 max-w-full rounded-lg object-contain bg-black/5" />
    </button>
    <div v-else class="w-48 h-32 rounded-lg flex items-center justify-center text-label-sm" :class="saya ? 'bg-on-primary/15' : 'bg-surface-container'">
      {{ gagal ? 'Gambar gagal dimuat' : 'Memuat gambar...' }}
    </div>
  </div>
  <button
    v-else
    type="button"
    class="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left min-w-[12rem] max-w-full"
    :class="saya ? 'bg-on-primary/15 hover:bg-on-primary/25' : 'bg-surface-container hover:bg-surface-container-high'"
    :disabled="mengunduh"
    :title="`Unduh ${lampiran.nama}`"
    @click="unduh"
  >
    <span class="material-symbols-outlined" style="font-size: 28px">{{ ikon }}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-label-md font-medium truncate">{{ lampiran.nama }}</span>
      <span class="block text-[11px] opacity-80">{{ mengunduh ? 'Mengunduh...' : ukuran }}</span>
    </span>
    <span class="material-symbols-outlined" style="font-size: 20px">download</span>
  </button>
</template>
