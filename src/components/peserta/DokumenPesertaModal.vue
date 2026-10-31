<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import VuePdfEmbed from 'vue-pdf-embed';
import 'vue-pdf-embed/dist/styles/textLayer.css';
import 'vue-pdf-embed/dist/styles/annotationLayer.css';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { pesertaApi } from '@/api/peserta';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import type { CalonMahasiswa, PesertaDokumenStatus } from '@/types/entities';

/**
 * Popup Dokumen Pendaftaran (menu Peserta): status kelengkapan tiap jenis dokumen yang diupload peserta
 * lewat portal PMB (/pendaftaran/dokumen). Hanya baca — file bisa dilihat / dibuka di tab baru.
 * beasiswa = false → Dokumen Pendaftaran (umum); true → Dokumen Pendaftaran 2 (khusus beasiswa).
 */
const props = defineProps<{ item: CalonMahasiswa | null; beasiswa?: boolean }>();
const open = defineModel<boolean>({ default: false });

const loading = ref(false);
const error = ref<string | null>(null);
const dokumen = ref<PesertaDokumenStatus[]>([]);

watch(open, async (v) => {
  if (!v || !props.item?.peserta) return;
  loading.value = true;
  error.value = null;
  dokumen.value = [];
  try {
    dokumen.value = (await pesertaApi.listDokumen(props.item.peserta.id)).filter((d) => d.isBeasiswa === !!props.beasiswa);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat dokumen peserta');
  } finally {
    loading.value = false;
  }
});

const preview = ref<PesertaDokumenStatus | null>(null);
const previewIsPdf = computed(() => preview.value?.upload?.file.startsWith('data:application/pdf') ?? false);
const previewPdfSource = computed(() => (preview.value?.upload ? { url: preview.value.upload.file } : null));
</script>

<template>
  <Modal
    v-model="open"
    :title="beasiswa ? 'Dokumen Pendaftaran 2 (Beasiswa)' : 'Dokumen Pendaftaran'"
    :subtitle="item?.peserta?.namaLengkap ?? item?.nama"
    size="lg"
  >
    <div v-if="loading" class="py-10 text-center text-on-surface-variant">Memuat data...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-body-sm">
        <thead>
          <tr class="bg-surface-container text-left text-on-surface">
            <th class="px-3 py-2.5 w-12 font-semibold">No</th>
            <th class="px-3 py-2.5 font-semibold">Dokumen</th>
            <th class="px-3 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in dokumen" :key="d.dokumenKelengkapanId" class="border-b border-outline-variant">
            <td class="px-3 py-2.5 text-on-surface-variant">{{ i + 1 }}</td>
            <td class="px-3 py-2.5 text-on-surface">
              {{ d.namaKelengkapan }}
              <span v-if="d.isWajib" class="ml-1 text-label-sm text-error">*</span>
            </td>
            <td class="px-3 py-2.5">
              <span v-if="!d.upload" class="text-error">Dokumen belum di upload</span>
              <div v-else class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1 text-success">
                  <span class="material-symbols-outlined" style="font-size: 16px">task_alt</span>Sudah di upload
                </span>
                <button type="button" class="text-primary hover:underline" :title="d.upload.fileName" @click="preview = d">Lihat</button>
                <span class="text-label-sm text-on-surface-variant">{{ formatDateTime(d.upload.updatedAt) }}</span>
              </div>
            </td>
          </tr>
          <tr v-if="dokumen.length === 0">
            <td colspan="3" class="px-3 py-8 text-center text-on-surface-variant">Belum ada jenis dokumen {{ beasiswa ? 'khusus beasiswa' : 'kelengkapan' }}.</td>
          </tr>
        </tbody>
      </table>
      <p v-if="dokumen.some((d) => d.isWajib)" class="mt-2 text-label-sm text-on-surface-variant"><span class="text-error">*</span> Wajib</p>
    </div>
    <template #footer>
      <AppButton variant="danger" @click="open = false">Tutup</AppButton>
    </template>
  </Modal>

  <Modal
    :model-value="!!preview"
    :title="preview?.namaKelengkapan ?? 'Preview Dokumen'"
    :subtitle="preview?.upload?.fileName"
    size="lg"
    @update:model-value="preview = null"
  >
    <div v-if="preview?.upload" class="flex justify-center bg-surface-container-low rounded-lg p-2 max-h-[70vh] overflow-auto">
      <VuePdfEmbed v-if="previewIsPdf && previewPdfSource" :source="previewPdfSource" class="w-full" />
      <img v-else :src="preview.upload.file" :alt="preview.upload.fileName" class="max-w-full h-auto rounded" />
    </div>
    <template #footer>
      <a
        v-if="preview?.upload"
        :href="preview.upload.file"
        :download="preview.upload.fileName"
        class="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors text-label-sm font-medium"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">download</span>
        Unduh
      </a>
    </template>
  </Modal>
</template>
