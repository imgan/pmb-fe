<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VuePdfEmbed from 'vue-pdf-embed';
import 'vue-pdf-embed/dist/styles/textLayer.css';
import 'vue-pdf-embed/dist/styles/annotationLayer.css';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import PesertaSidebar from '@/components/public/PesertaSidebar.vue';
import Modal from '@/components/ui/Modal.vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { pesertaAuthApi } from '@/api/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError, confirmAction } from '@/utils/swal';
import type { PesertaDokumenStatus } from '@/types/entities';

const pesertaAuthStore = usePesertaAuthStore();
const router = useRouter();
const route = useRoute();

// /pendaftaran/dokumen = Dokumen Pendaftaran (umum); /pendaftaran/dokumen-beasiswa = dokumen khusus beasiswa.
const beasiswa = computed(() => !!route.meta.dokumenBeasiswa);
const daftar = computed(() => items.value.filter((d) => d.isBeasiswa === beasiswa.value));

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const loading = ref(true);
const loadError = ref<string | null>(null);
const items = ref<PesertaDokumenStatus[]>([]);
const uploadingId = ref<number | null>(null);
const fileInputs = ref<Record<number, HTMLInputElement | null>>({});

const loadItems = async () => {
  loading.value = true;
  loadError.value = null;
  try {
    items.value = await pesertaAuthApi.listMyDokumen();
    pesertaAuthStore.dokumen = items.value;
  } catch (err) {
    loadError.value = extractErrorMessage(err, 'Gagal memuat data dokumen');
  } finally {
    loading.value = false;
  }
};

onMounted(loadItems);

const triggerFilePicker = (dokumenKelengkapanId: number) => {
  fileInputs.value[dokumenKelengkapanId]?.click();
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const onFileChange = async (item: PesertaDokumenStatus, event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!ALLOWED_TYPES.includes(file.type)) {
    toastError('Format file tidak didukung. Hanya PDF, PNG, atau JPEG.');
    input.value = '';
    return;
  }
  if (file.size > MAX_SIZE_BYTES) {
    toastError('Ukuran file maksimal 5 MB.');
    input.value = '';
    return;
  }

  uploadingId.value = item.dokumenKelengkapanId;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    await pesertaAuthApi.uploadMyDokumen(item.dokumenKelengkapanId, file.name, dataUrl);
    await loadItems();
    toastSuccess(`${item.namaKelengkapan} berhasil diupload`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengupload dokumen'));
  } finally {
    uploadingId.value = null;
    input.value = '';
  }
};

const removeUpload = async (item: PesertaDokumenStatus) => {
  const confirmed = await confirmAction({
    title: 'Hapus Dokumen?',
    text: `File untuk "${item.namaKelengkapan}" akan dihapus.`,
  });
  if (!confirmed) return;

  uploadingId.value = item.dokumenKelengkapanId;
  try {
    await pesertaAuthApi.removeMyDokumen(item.dokumenKelengkapanId);
    await loadItems();
    toastSuccess('Dokumen dihapus');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus dokumen'));
  } finally {
    uploadingId.value = null;
  }
};

const previewTarget = ref<PesertaDokumenStatus | null>(null);
const openPreview = (item: PesertaDokumenStatus) => {
  previewTarget.value = item;
};
const closePreview = () => {
  previewTarget.value = null;
};
const previewIsPdf = computed(() => previewTarget.value?.upload?.file.startsWith('data:application/pdf') ?? false);
const previewPdfSource = computed(() => (previewTarget.value?.upload ? { url: previewTarget.value.upload.file } : null));

const handleLogout = () => {
  pesertaAuthStore.logout();
  router.push('/');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <!-- Grid: judul di atas kolom isi, menu kiri & isi mulai di garis yang sama. -->
    <div class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-12 py-10 md:py-16 grid md:grid-cols-[15rem_minmax(0,1fr)] gap-x-10 gap-y-6 md:gap-y-0 content-start">
      <div class="md:col-start-2 w-full max-w-3xl text-center md:mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">{{ beasiswa ? 'Dokumen Pendaftaran Beasiswa' : 'Dokumen Pendaftaran' }}</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          {{ beasiswa ? 'Lengkapi berkas khusus jalur beasiswa.' : 'Lengkapi berkas persyaratan pendaftaran Anda.' }} Format yang diterima: PDF, PNG, atau JPEG (maks. 5 MB).
        </p>
      </div>
      <PesertaSidebar class="md:row-start-2 self-start" />
      <main class="md:row-start-2 min-w-0 w-full max-w-3xl">
        <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>
        <div v-else-if="loadError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ loadError }}
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="item in daftar"
            :key="item.dokumenKelengkapanId"
            class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 md:p-6"
          >
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <span
                  class="material-symbols-outlined mt-0.5"
                  :class="item.upload ? 'text-success' : 'text-on-surface-variant'"
                >
                  {{ item.upload ? 'task_alt' : 'radio_button_unchecked' }}
                </span>
                <div>
                  <p class="text-body-lg font-semibold text-on-background">{{ item.namaKelengkapan }}</p>
                  <div class="flex flex-wrap items-center gap-2 mt-1">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
                      :class="item.isWajib ? 'bg-danger-container text-on-danger-container' : 'bg-surface-container text-on-surface-variant'"
                    >
                      {{ item.isWajib ? 'Wajib' : 'Opsional' }}
                    </span>
                    <span
                      v-if="item.isBeasiswa"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm bg-secondary-container text-on-secondary-container"
                    >
                      Khusus Beasiswa
                    </span>
                  </div>
                  <p v-if="item.upload" class="text-body-sm text-on-surface-variant mt-2">
                    {{ item.upload.fileName }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <input
                  :ref="(el) => (fileInputs[item.dokumenKelengkapanId] = el as HTMLInputElement)"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  class="hidden"
                  @change="onFileChange(item, $event)"
                />
                <button
                  v-if="item.upload"
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors text-label-sm font-medium"
                  @click="openPreview(item)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
                  Lihat
                </button>
                <button
                  type="button"
                  :disabled="uploadingId === item.dokumenKelengkapanId"
                  class="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-primary text-on-primary text-label-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  @click="triggerFilePicker(item.dokumenKelengkapanId)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">upload</span>
                  {{ uploadingId === item.dokumenKelengkapanId ? 'Mengupload...' : item.upload ? 'Ganti File' : 'Upload' }}
                </button>
                <button
                  v-if="item.upload"
                  type="button"
                  :disabled="uploadingId === item.dokumenKelengkapanId"
                  class="text-outline hover:text-error transition-colors disabled:opacity-60"
                  title="Hapus file"
                  @click="removeUpload(item)"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>

          <p v-if="daftar.length === 0" class="text-center py-12 text-on-surface-variant">
            Belum ada persyaratan dokumen yang perlu diupload.
          </p>
        </div>

        <RouterLink
          to="/pendaftaran/status"
          class="mt-6 w-full bg-primary text-on-primary font-semibold text-label-md py-3.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined text-[20px]">timeline</span>
          Lihat Status Pendaftaran
        </RouterLink>

        <p class="text-center mt-8">
          <button type="button" class="text-body-sm text-on-surface-variant hover:text-error transition-colors" @click="handleLogout">
            Keluar dari akun
          </button>
        </p>
      </main>
    </div>

    <Modal
      :model-value="!!previewTarget"
      :title="previewTarget?.namaKelengkapan ?? 'Preview Dokumen'"
      :subtitle="previewTarget?.upload?.fileName"
      size="lg"
      @update:model-value="closePreview"
    >
      <div v-if="previewTarget?.upload" class="flex justify-center bg-surface-container-low rounded-lg p-2 max-h-[70vh] overflow-auto">
        <VuePdfEmbed v-if="previewIsPdf && previewPdfSource" :source="previewPdfSource" class="w-full" />
        <img v-else :src="previewTarget.upload.file" :alt="previewTarget.upload.fileName" class="max-w-full h-auto rounded" />
      </div>
      <template #footer>
        <a
          v-if="previewTarget?.upload"
          :href="previewTarget.upload.file"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors text-label-sm font-medium"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">open_in_new</span>
          Buka di Tab Baru
        </a>
      </template>
    </Modal>

    <PublicFooter />
  </div>
</template>
