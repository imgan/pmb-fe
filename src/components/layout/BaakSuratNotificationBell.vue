<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { suratKeteranganApi } from '@/api/suratKeterangan';
import { usePermission } from '@/composables/usePermission';
import { formatDate } from '@/utils/format';
import { MENU } from '@/constants/menuCodes';
import type { SuratKeterangan } from '@/types/entities';

const POLL_INTERVAL_MS = 60_000;

const { canRead } = usePermission(MENU.LAPORAN_CETAK_SURAT_MANAGEMENT);

const router = useRouter();
const isOpen = ref(false);
const count = ref(0);
// Badge lonceng hanya tampil untuk pengajuan yang belum pernah "dilihat" (panel belum pernah
// dibuka sejak pengajuan itu masuk) — seenCount di-set ke count saat ini setiap panel dibuka,
// jadi badge otomatis hilang meski data pending di server masih ada (staf sudah tahu/melihatnya).
// Kalau ada pengajuan baru lagi setelah itu, count akan > seenCount lagi dan badge muncul lagi.
const seenCount = ref(0);
const items = ref<SuratKeterangan[]>([]);
const loading = ref(false);

const fetchPending = async () => {
  if (!canRead.value) return;
  loading.value = true;
  try {
    const result = await suratKeteranganApi.list({ status: 'DIAJUKAN', limit: 5, sortBy: 'tanggalInput', sortDir: 'desc' });
    items.value = result.data;
    count.value = result.meta.total;
  } catch {
    // Diam-diam gagal — notifikasi bukan fitur kritis, jangan ganggu halaman lain dengan toast error.
  } finally {
    loading.value = false;
  }
};

const toggleOpen = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await fetchPending();
    seenCount.value = count.value;
  }
};

const closePanel = () => {
  isOpen.value = false;
};

const goToSurat = (item?: SuratKeterangan) => {
  closePanel();
  router.push({ name: 'baak-laporan-cetak-surat', query: item ? { search: item.mahasiswa?.nim } : undefined });
};

let pollTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  fetchPending();
  pollTimer = setInterval(fetchPending, POLL_INTERVAL_MS);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <div v-if="canRead" class="fixed top-4 right-4 md:right-8 z-40">
    <button
      type="button"
      class="relative w-11 h-11 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
      title="Notifikasi pengajuan surat"
      @click="toggleOpen"
    >
      <span class="material-symbols-outlined" style="font-size: 22px">notifications</span>
      <span
        v-if="count > seenCount"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-semibold flex items-center justify-center"
      >
        {{ count - seenCount > 9 ? '9+' : count - seenCount }}
      </span>
    </button>

    <div v-if="isOpen" class="fixed inset-0 z-30" @click="closePanel" />

    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_8px_24px_rgba(27,54,93,0.12)] z-40 overflow-hidden"
    >
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between">
        <span>Pengajuan Cetak Surat</span>
        <span v-if="count > 0" class="text-label-sm opacity-90">{{ count }} menunggu</span>
      </div>

      <div v-if="loading" class="p-4 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else-if="!items.length" class="p-4 text-center text-body-sm text-on-surface-variant">
        Tidak ada pengajuan surat yang menunggu diproses.
      </div>
      <div v-else class="max-h-80 overflow-y-auto divide-y divide-outline-variant">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="w-full text-left px-4 py-3 hover:bg-surface-container transition-colors"
          @click="goToSurat(item)"
        >
          <p class="text-body-sm font-medium text-on-surface">
            {{ item.mahasiswa?.nim ?? '-' }} &middot; {{ item.mahasiswa?.namaLengkap ?? '-' }}
          </p>
          <p class="text-label-sm text-on-surface-variant mt-0.5">
            Mengajukan {{ formatDate(item.tanggalInput) }}
          </p>
        </button>
      </div>

      <div class="p-2 border-t border-outline-variant">
        <button
          type="button"
          class="w-full text-center py-2 text-label-sm text-primary hover:underline"
          @click="goToSurat()"
        >
          Lihat Semua Pengajuan Surat
        </button>
      </div>
    </div>
  </div>
</template>
