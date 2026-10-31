<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenElearningApi, formatDurasi, type PengumpulanTugas } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { dataUrlToBlob, downloadBlob } from '@/utils/download';
import { formatDateTime } from '@/utils/format';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Pengumpulan tugas (dosen): ringkasan (dikumpulkan, terlambat, dinilai, rata nilai) dan tabel per mahasiswa — jawaban
 * teks, unduh file, status terlambat, isian nilai 0–100 & catatan yang disimpan per baris.
 */
const props = defineProps<{ kontenId: number | null }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ dinilai: [] }>();

const data = ref<PengumpulanTugas | null>(null);
const error = ref<string | null>(null);
const filter = ref<'semua' | 'kumpul' | 'belum' | 'perlu'>('semua');
// Isian nilai per jawaban (draf sebelum disimpan).
const draf = reactive<Record<number, { nilai: string; catatan: string; menyimpan: boolean }>>({});

const load = async () => {
  if (!props.kontenId) return;
  error.value = null;
  try {
    data.value = await dosenElearningApi.pengumpulan(props.kontenId);
    data.value.rows.forEach((r) => {
      if (r.jawabanId) draf[r.jawabanId] = { nilai: r.nilai === null ? '' : String(r.nilai), catatan: r.catatan ?? '', menyimpan: false };
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pengumpulan');
  }
};
watch(
  open,
  (v) => {
    if (v) {
      data.value = null;
      filter.value = 'semua';
      load();
    }
  },
  { immediate: true },
);

const baris = computed(() =>
  (data.value?.rows ?? []).filter((r) =>
    filter.value === 'kumpul' ? !!r.jawabanId : filter.value === 'belum' ? !r.jawabanId : filter.value === 'perlu' ? !!r.jawabanId && r.nilai === null : true,
  ),
);
const unduh = async (jawabanId: number) => {
  try {
    const f = await dosenElearningApi.lampiranJawaban(jawabanId);
    if (f.lampiran) downloadBlob(dataUrlToBlob(f.lampiran), f.lampiranNama || 'jawaban');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh file'));
  }
};
const simpanNilai = async (jawabanId: number) => {
  const d = draf[jawabanId];
  const n = Number(d.nilai);
  if (d.nilai === '' || !Number.isFinite(n) || n < 0 || n > 100) return toastError('Nilai harus 0–100');
  d.menyimpan = true;
  try {
    await dosenElearningApi.nilaiTugas(jawabanId, n, d.catatan.trim() || null);
    toastSuccess('Nilai disimpan');
    await load();
    emit('dinilai');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan nilai'));
  } finally {
    d.menyimpan = false;
  }
};
const angka = (v: number | null) => (v === null ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
</script>

<template>
  <Modal v-model="open" :title="data ? `Pengumpulan — ${data.konten.judul}` : 'Pengumpulan Tugas'" :subtitle="data?.konten.tenggat ? `Tenggat: ${formatDateTime(data.konten.tenggat)}` : 'Tanpa tenggat'" size="2xl">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-else-if="!data" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-center">
        <div class="rounded-md bg-surface-container py-3">
          <p class="text-headline-sm font-semibold">{{ data.ringkasan.penerima }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ data.konten.target === 'KAMPUS' ? 'Penerima (kampus)' : 'Penerima' }}</p>
        </div>
        <div class="rounded-md bg-surface-container py-3">
          <p class="text-headline-sm font-semibold">{{ data.ringkasan.dikumpulkan }}</p>
          <p class="text-label-sm text-on-surface-variant">Dikumpulkan</p>
        </div>
        <div class="rounded-md bg-surface-container py-3">
          <p class="text-headline-sm font-semibold text-[#b4690e]">{{ data.ringkasan.terlambat }}</p>
          <p class="text-label-sm text-on-surface-variant">Terlambat</p>
        </div>
        <div class="rounded-md bg-surface-container py-3">
          <p class="text-headline-sm font-semibold">{{ data.ringkasan.dinilai }}</p>
          <p class="text-label-sm text-on-surface-variant">Sudah dinilai</p>
        </div>
        <div class="rounded-md bg-surface-container py-3">
          <p class="text-headline-sm font-semibold">{{ angka(data.ringkasan.rataNilai) }}</p>
          <p class="text-label-sm text-on-surface-variant">Rata-rata nilai</p>
        </div>
      </div>

      <div class="mb-3 inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md">
        <button
          v-for="f in [
            { key: 'semua', label: 'Semua' },
            { key: 'kumpul', label: 'Sudah kumpul' },
            { key: 'perlu', label: 'Perlu dinilai' },
            { key: 'belum', label: 'Belum kumpul' },
          ] as const"
          :key="f.key"
          type="button"
          class="px-3 py-1.5 border-l border-outline-variant first:border-l-0"
          :class="filter === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
          @click="filter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
      <p v-if="data.konten.target === 'KAMPUS'" class="mb-2 text-label-sm text-on-surface-variant">
        Tugas untuk seluruh kampus: daftar memuat peserta kelas ini dan mahasiswa lain yang sudah mengumpulkan.
      </p>

      <div class="space-y-2.5 max-h-[28rem] overflow-y-auto">
        <p v-if="!baris.length" class="p-6 text-center text-body-sm text-on-surface-variant">Tidak ada data.</p>
        <div v-for="r in baris" :key="r.id" class="rounded-lg border border-outline-variant p-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-on-surface">{{ r.nama }}</span>
            <span class="text-label-sm text-on-surface-variant">{{ r.nim }}</span>
            <span v-if="r.grup" class="px-2 py-0.5 rounded-full text-label-sm bg-[#7c3aed]/12 text-[#5b21b6]">{{ r.grup }}</span>
            <span class="inline-flex items-center gap-0.5 text-label-sm text-on-surface-variant" title="Durasi aktif membuka tugas">
              <span class="material-symbols-outlined" style="font-size: 14px">timer</span>{{ r.durasi ? formatDurasi(r.durasi) : 'belum dibuka' }}
            </span>
            <span v-if="!r.jawabanId" class="ml-auto px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant">Belum mengumpulkan</span>
            <template v-else>
              <span v-if="r.terlambat" class="px-2 py-0.5 rounded-full text-label-sm bg-[#eda100]/20 text-[#7a5200]">Terlambat</span>
              <span class="ml-auto text-label-sm text-on-surface-variant">
                Dikumpulkan {{ formatDateTime(r.dikumpulkan) }}{{ r.dikumpulkanOleh ? ` oleh ${r.dikumpulkanOleh}` : '' }}
              </span>
            </template>
          </div>
          <template v-if="r.jawabanId && draf[r.jawabanId]">
            <p v-if="r.isi" class="mt-2 text-body-sm text-on-surface whitespace-pre-line rounded-md bg-surface-container-low p-2.5">{{ r.isi }}</p>
            <button v-if="r.lampiranNama" type="button" class="mt-2 inline-flex items-center gap-1 text-label-md text-primary hover:underline" @click="unduh(r.jawabanId)">
              <span class="material-symbols-outlined" style="font-size: 18px">download</span>{{ r.lampiranNama }}
            </button>
            <div class="mt-3 grid grid-cols-1 md:grid-cols-[7rem_1fr_auto] gap-2 items-start">
              <input
                v-model="draf[r.jawabanId].nilai"
                type="number"
                min="0"
                max="100"
                step="0.01"
                class="px-3 py-2 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest text-right"
                placeholder="Nilai"
                aria-label="Nilai"
              />
              <input
                v-model="draf[r.jawabanId].catatan"
                maxlength="2000"
                class="px-3 py-2 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
                placeholder="Catatan untuk mahasiswa (opsional)"
                aria-label="Catatan"
              />
              <AppButton :icon="r.nilai === null ? 'grading' : 'save'" :disabled="draf[r.jawabanId].menyimpan" @click="simpanNilai(r.jawabanId)">
                {{ r.nilai === null ? 'Beri Nilai' : 'Ubah Nilai' }}
              </AppButton>
            </div>
            <p v-if="r.dinilaiAt" class="mt-1 text-label-sm text-[#05603a]">Nilai {{ angka(r.nilai) }} · dinilai {{ formatDateTime(r.dinilaiAt) }}</p>
          </template>
        </div>
      </div>
    </template>
  </Modal>
</template>
