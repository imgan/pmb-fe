<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { dosenElearningApi, type KomentarKonten } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { toastError } from '@/utils/swal';

/** Komentar / pertanyaan mahasiswa pada satu konten (portal dosen): baca, balas, dan hapus (moderasi). */
const props = defineProps<{ kontenId: number | null; judul?: string }>();
const open = defineModel<boolean>({ default: false });

const komentar = ref<KomentarKonten[]>([]);
const loading = ref(false);
const isi = ref('');
const mengirim = ref(false);
watch(
  () => [open.value, props.kontenId],
  async () => {
    if (!open.value || !props.kontenId) return;
    loading.value = true;
    try {
      komentar.value = await dosenElearningApi.komentar(props.kontenId);
    } catch (err) {
      toastError(extractErrorMessage(err, 'Gagal memuat komentar'));
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);
const kirim = async () => {
  if (!props.kontenId || !isi.value.trim()) return;
  mengirim.value = true;
  try {
    komentar.value = await dosenElearningApi.tambahKomentar(props.kontenId, isi.value.trim());
    isi.value = '';
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengirim balasan'));
  } finally {
    mengirim.value = false;
  }
};
const hapus = async (k: KomentarKonten) => {
  try {
    await dosenElearningApi.hapusKomentar(k.id);
    komentar.value = komentar.value.filter((x) => x.id !== k.id);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus komentar'));
  }
};
const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <Modal v-model="open" :title="judul ? `Komentar · ${judul}` : 'Komentar'" size="lg">
    <p v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</p>
    <p v-else-if="!komentar.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada komentar.</p>
    <ul v-else class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
      <li v-for="k in komentar" :key="k.id" class="flex gap-3">
        <span
          class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-semibold"
          :class="k.peran === 'DOSEN' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'"
        >
          {{ (k.nama ?? '?').charAt(0).toUpperCase() }}
        </span>
        <div class="flex-1 min-w-0 rounded-lg bg-surface-container-low px-3 py-2">
          <p class="text-body-sm">
            <span class="font-semibold">{{ k.nama }}</span>
            <span v-if="k.peran === 'DOSEN'" class="ml-1 text-[11px] rounded px-1.5 py-0.5 bg-primary-container text-on-primary-container">Dosen</span>
            <span class="ml-2 text-label-sm text-on-surface-variant">{{ waktu(k.createdAt) }}</span>
          </p>
          <p class="text-body-md whitespace-pre-line break-words">{{ k.isi }}</p>
        </div>
        <button type="button" class="self-start p-1 text-on-surface-variant hover:text-[#a32020]" title="Hapus komentar" @click="hapus(k)">
          <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
        </button>
      </li>
    </ul>
    <form class="mt-4 flex gap-2" @submit.prevent="kirim">
      <input
        v-model="isi"
        type="text"
        maxlength="1000"
        placeholder="Tulis balasan..."
        class="flex-1 px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-md focus:border-primary focus:outline-none"
      />
      <button type="submit" :disabled="mengirim || !isi.trim()" class="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-label-md disabled:opacity-60">
        {{ mengirim ? 'Mengirim...' : 'Balas' }}
      </button>
    </form>
  </Modal>
</template>
