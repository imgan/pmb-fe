<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { lmsConsoleApi, type LmsKontenDetail } from '@/api/lmsConsole';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import { JENIS_KONTEN, TARGET_KONTEN, teksAngka, teksDurasi } from '@/utils/lmsKonten';

/** Detail satu konten e-learning (konsol LMS): info konten + status tiap penerima. */
const props = defineProps<{ kontenId: number | null }>();
const open = defineModel<boolean>({ default: false });

const data = ref<LmsKontenDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
watch(
  () => [open.value, props.kontenId],
  async () => {
    if (!open.value || !props.kontenId) return;
    loading.value = true;
    error.value = null;
    data.value = null;
    try {
      data.value = await lmsConsoleApi.kontenDetail(props.kontenId);
    } catch (err) {
      error.value = extractErrorMessage(err, 'Gagal memuat detail konten');
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

const k = computed(() => data.value?.konten);
const rows = computed(() => data.value?.rows ?? []);
const selesai = computed(() => rows.value.filter((r) => r.selesaiAt).length);
const labelSelesai = computed(() => (k.value?.jenis === 'KUIS' ? 'Dikerjakan' : k.value?.jenis === 'TUGAS' ? 'Dikumpulkan' : 'Selesai'));
</script>

<template>
  <Modal v-model="open" :title="k?.judul ?? 'Detail konten'" :subtitle="data?.kelas ? `${data.kelas.namaMataKuliah} · Kelas ${data.kelas.kelas} · ${data.kelas.tahunAjaran ?? ''}` : ''" size="xl">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <template v-if="k">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-label-sm font-semibold" :class="JENIS_KONTEN[k.jenis].kelas">
          <span class="material-symbols-outlined" style="font-size: 15px">{{ JENIS_KONTEN[k.jenis].icon }}</span>{{ JENIS_KONTEN[k.jenis].label }}
        </span>
        <span v-if="k.isWajib" class="rounded px-2 py-0.5 text-label-sm bg-[#d83b3b]/10 text-[#a32020] font-semibold">Wajib</span>
        <span class="rounded px-2 py-0.5 text-label-sm" :class="k.isPublished ? 'bg-success-container text-on-success-container' : 'bg-surface-container text-on-surface-variant'">{{ k.isPublished ? 'Terbit' : 'Draf' }}</span>
        <span class="text-label-sm text-on-surface-variant">{{ TARGET_KONTEN[k.target] }}<template v-if="k.pertemuanKe"> · Pertemuan {{ k.pertemuanKe }}</template></span>
      </div>
      <dl class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-body-sm">
        <div><dt class="text-label-sm text-on-surface-variant">Dosen</dt><dd class="text-on-surface font-medium">{{ k.namaDosen ?? '-' }}</dd></div>
        <div><dt class="text-label-sm text-on-surface-variant">Diunggah</dt><dd class="text-on-surface">{{ formatDateTime(k.createdAt) }}</dd></div>
        <div><dt class="text-label-sm text-on-surface-variant">Tenggat</dt><dd class="text-on-surface">{{ k.tenggat ? formatDateTime(k.tenggat) : '-' }}</dd></div>
        <div>
          <dt class="text-label-sm text-on-surface-variant">{{ labelSelesai }}</dt>
          <dd class="text-on-surface font-semibold">{{ selesai }} / {{ rows.length }}<template v-if="k.jenis === 'KUIS'"> · {{ k.jumlahSoal }} soal</template></dd>
        </div>
      </dl>
      <p v-if="k.deskripsi" class="mb-3 text-body-sm text-on-surface-variant whitespace-pre-line">{{ k.deskripsi }}</p>
      <p v-if="k.url" class="mb-3 text-body-sm">
        <a :href="k.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
          <span class="material-symbols-outlined" style="font-size: 16px">open_in_new</span>Buka tautan
        </a>
        <span v-if="k.lampiranNama" class="ml-3 text-on-surface-variant">Lampiran: {{ k.lampiranNama }}</span>
      </p>

      <div class="rounded-lg border border-outline-variant overflow-x-auto max-h-[55vh]">
        <table class="w-full text-body-sm">
          <thead class="bg-surface-container-low text-label-md text-on-surface-variant sticky top-0">
            <tr>
              <th class="text-left font-semibold px-3 py-2">NIM</th>
              <th class="text-left font-semibold px-3 py-2">Nama</th>
              <th class="text-center font-semibold px-3 py-2">Dilihat</th>
              <th class="text-center font-semibold px-3 py-2">Durasi</th>
              <th class="text-left font-semibold px-3 py-2">{{ labelSelesai }}</th>
              <th v-if="k.jenis === 'KUIS' || k.jenis === 'TUGAS'" class="text-center font-semibold px-3 py-2">{{ k.jenis === 'KUIS' ? 'Skor' : 'Nilai' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length"><td colspan="6" class="px-3 py-6 text-center text-on-surface-variant">Belum ada penerima.</td></tr>
            <tr v-for="r in rows" :key="r.id" class="border-t border-outline-variant">
              <td class="px-3 py-2 tabular-nums">{{ r.nim }}</td>
              <td class="px-3 py-2">{{ r.nama }}<span v-if="r.grup" class="ml-1 text-label-sm text-on-surface-variant">({{ r.grup }})</span></td>
              <td class="px-3 py-2 text-center tabular-nums">{{ r.dilihat || '–' }}</td>
              <td class="px-3 py-2 text-center">{{ teksDurasi(r.durasi) }}</td>
              <td class="px-3 py-2">
                <span v-if="r.selesaiAt" class="inline-flex items-center gap-1 text-[#047857]">
                  <span class="material-symbols-outlined" style="font-size: 16px; font-variation-settings: 'FILL' 1">check_circle</span>{{ formatDateTime(r.selesaiAt) }}
                </span>
                <span v-else class="text-on-surface-variant">Belum</span>
                <span v-if="r.terlambat" class="ml-1 rounded px-1.5 py-0.5 text-[11px] bg-[#d97706]/12 text-[#92400e] font-semibold">Terlambat</span>
              </td>
              <td v-if="k.jenis === 'KUIS' || k.jenis === 'TUGAS'" class="px-3 py-2 text-center font-semibold tabular-nums">
                {{ teksAngka(r.skor) }}<span v-if="r.benar" class="block text-[11px] font-normal text-on-surface-variant">{{ r.benar }} benar</span>
                <span v-else-if="k.jenis === 'TUGAS' && r.selesaiAt && r.skor == null" class="block text-[11px] font-normal text-[#b45309]">belum dinilai</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </Modal>
</template>
