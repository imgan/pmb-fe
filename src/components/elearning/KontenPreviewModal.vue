<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenElearningApi, youtubeEmbed, type KontenDetail } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { dataUrlToBlob, downloadBlob } from '@/utils/download';
import MateriMedia from './MateriMedia.vue';
import { formatDateTime } from '@/utils/format';

/** Pratinjau konten untuk dosen (seperti yang dilihat mahasiswa): isi & lampiran materi, video, soal + kunci kuis. */
const props = defineProps<{ kontenId: number | null; subtitle?: string }>();
const open = defineModel<boolean>({ default: false });
defineEmits<{ ubah: [] }>();

const detail = ref<KontenDetail | null>(null);
const error = ref<string | null>(null);
watch(open, async (v) => {
  if (!v || !props.kontenId) return;
  detail.value = null;
  error.value = null;
  try {
    detail.value = await dosenElearningApi.konten(props.kontenId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat konten');
  }
});
const embed = computed(() => (detail.value?.jenis === 'VIDEO' ? youtubeEmbed(detail.value.url) : null));
const unduh = () => detail.value?.lampiran && downloadBlob(dataUrlToBlob(detail.value.lampiran), detail.value.lampiranNama || 'lampiran');
const HURUF = 'ABCDEF';
</script>

<template>
  <Modal v-model="open" :title="detail?.judul ?? 'Memuat...'" :subtitle="subtitle" size="2xl">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-else-if="!detail" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <div v-else class="space-y-4">
      <p class="text-label-sm text-on-surface-variant">
        {{ detail.pertemuanKe ? `Pertemuan ${detail.pertemuanKe} · ` : '' }}{{
          detail.target === 'SEMUA'
            ? 'Semua peserta kelas'
            : detail.target === 'KAMPUS'
              ? 'Semua mahasiswa kampus'
              : detail.target === 'GRUP'
                ? `${detail.grup.length} grup (${detail.penerima.length} mahasiswa)`
                : `${detail.penerima.length} mahasiswa terpilih`
        }} ·
        {{ detail.isPublished ? 'Terbit' : 'Draf' }} · dibuat {{ formatDateTime(detail.createdAt) }}
      </p>
      <p v-if="detail.deskripsi" class="text-body-sm whitespace-pre-line">{{ detail.deskripsi }}</p>

      <template v-if="detail.jenis === 'MATERI'">
        <div v-if="detail.isi" class="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4 text-body-sm whitespace-pre-line">{{ detail.isi }}</div>
        <MateriMedia
          :video-urls="detail.videoUrls"
          :gambar="detail.gambar"
          :dokumen="detail.dokumen"
          :ambil="(berkasId) => dosenElearningApi.berkas(detail!.id, berkasId)"
        />
        <div class="flex flex-wrap gap-2">
          <AppButton v-if="detail.lampiran" icon="download" @click="unduh">Unduh {{ detail.lampiranNama }}</AppButton>
          <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener"><AppButton variant="secondary" icon="open_in_new">Buka Link Materi</AppButton></a>
        </div>
      </template>

      <template v-if="detail.jenis === 'VIDEO'">
        <div v-if="embed" class="aspect-video rounded-lg overflow-hidden border border-outline-variant">
          <iframe :src="embed" class="w-full h-full" :title="detail.judul" allowfullscreen />
        </div>
        <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener"><AppButton variant="secondary" icon="open_in_new">Buka Video di Tab Baru</AppButton></a>
      </template>

      <template v-if="detail.jenis === 'TUGAS'">
        <p v-if="detail.tenggat" class="text-body-sm">Tenggat pengumpulan: <strong>{{ formatDateTime(detail.tenggat) }}</strong></p>
        <div v-if="detail.isi" class="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4 text-body-sm whitespace-pre-line">{{ detail.isi }}</div>
        <div class="flex flex-wrap gap-2">
          <AppButton v-if="detail.lampiran" icon="download" @click="unduh">Unduh {{ detail.lampiranNama }}</AppButton>
          <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener"><AppButton variant="secondary" icon="open_in_new">Buka Link Referensi</AppButton></a>
        </div>
      </template>

      <template v-if="detail.jenis === 'KUIS'">
        <p v-if="detail.tenggat" class="text-body-sm">Batas pengerjaan: {{ formatDateTime(detail.tenggat) }}</p>
        <div v-for="(s, i) in detail.soal" :key="s.id ?? i" class="rounded-lg border border-outline-variant p-4">
          <p class="font-medium mb-2 whitespace-pre-line">{{ i + 1 }}. {{ s.pertanyaan }}</p>
          <div class="space-y-1.5">
            <div
              v-for="(p, j) in s.pilihan"
              :key="j"
              class="flex items-center gap-2 px-3 py-2 rounded-md border text-body-sm"
              :class="s.jawabanBenar === j ? 'border-[#059669] bg-[#059669]/10' : 'border-outline-variant'"
            >
              <span class="font-semibold w-5">{{ HURUF[j] }}.</span>
              <span class="flex-1">{{ p }}</span>
              <span v-if="s.jawabanBenar === j" class="material-symbols-outlined text-[#05603a]" style="font-size: 18px" title="Kunci jawaban">check_circle</span>
            </div>
          </div>
        </div>
      </template>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Tutup</AppButton>
      <AppButton v-if="detail" icon="edit" @click="(open = false), $emit('ubah')">Ubah</AppButton>
    </template>
  </Modal>
</template>
