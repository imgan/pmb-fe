<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import FileInput from '@/components/ui/FileInput.vue';
import Modal from '@/components/ui/Modal.vue';
import { homeImagesApi } from '@/api/homeImages';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastSuccess, toastError } from '@/utils/swal';

const { canUpdate } = usePermission(MENU.HOME_IMAGE_MANAGEMENT);

const loading = ref(true);
const submitting = ref(false);
const formError = ref<string | null>(null);

const emptyImages = () => ({
  heroImage: null as string | null,
  programStudiImage: null as string | null,
  kehidupanKampusImage: null as string | null,
  fasilitasLabImage: null as string | null,
  fasilitasGedungImage: null as string | null,
  fasilitasAulaImage: null as string | null,
  beasiswaSlide1Image: null as string | null,
  beasiswaSlide2Image: null as string | null,
});

const form = reactive(emptyImages());
/** Snapshot dari nilai tersimpan saat halaman dibuka — dipakai tombol "Lihat Gambar Sebelumnya" agar tetap menampilkan gambar lama walau form sudah diganti dengan file baru. */
const originalImages = reactive(emptyImages());

const load = async () => {
  loading.value = true;
  formError.value = null;
  try {
    const homeImages = await homeImagesApi.get();
    if (homeImages) {
      const values = {
        heroImage: homeImages.heroImage,
        programStudiImage: homeImages.programStudiImage,
        kehidupanKampusImage: homeImages.kehidupanKampusImage,
        fasilitasLabImage: homeImages.fasilitasLabImage,
        fasilitasGedungImage: homeImages.fasilitasGedungImage,
        fasilitasAulaImage: homeImages.fasilitasAulaImage,
        beasiswaSlide1Image: homeImages.beasiswaSlide1Image,
        beasiswaSlide2Image: homeImages.beasiswaSlide2Image,
      };
      Object.assign(form, values);
      Object.assign(originalImages, values);
    }
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal memuat konfigurasi gambar beranda');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const handleSubmit = async () => {
  submitting.value = true;
  formError.value = null;
  try {
    await homeImagesApi.update({ ...form });
    Object.assign(originalImages, form);
    toastSuccess('Gambar beranda berhasil disimpan');
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan gambar beranda');
    formError.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};

const previewOpen = ref(false);
const previewLabel = ref('');
const previewSrc = ref<string | null>(null);

const openPreview = (label: string, src: string | null) => {
  previewLabel.value = label;
  previewSrc.value = src || null;
  previewOpen.value = true;
};
</script>

<template>
  <div>
    <PageHeader
      title="Gambar Beranda"
      subtitle="Ganti gambar-gambar yang tampil di halaman Beranda website publik. Kosongkan untuk memakai gambar bawaan."
    />

    <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>

    <form v-else class="max-w-3xl space-y-6" @submit.prevent="handleSubmit">
      <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ formError }}
      </div>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 space-y-4">
        <h2 class="font-semibold text-headline-md text-on-surface">Hero</h2>
        <p class="text-body-sm text-on-surface-variant -mt-2">Gambar besar di bagian paling atas halaman Beranda.</p>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-label-md text-on-surface">Gambar Hero</span>
            <button
              type="button"
              class="flex items-center gap-1 text-label-sm text-primary hover:underline"
              @click="openPreview('Gambar Hero', originalImages.heroImage)"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>
              Lihat Gambar Sebelumnya
            </button>
          </div>
          <FileInput v-model="form.heroImage" accept="image/*" preview />
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 space-y-4">
        <h2 class="font-semibold text-headline-md text-on-surface">Pilihan Program Studi</h2>
        <p class="text-body-sm text-on-surface-variant -mt-2">Gambar di sisi kanan section daftar program studi.</p>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-label-md text-on-surface">Gambar Program Studi</span>
            <button
              type="button"
              class="flex items-center gap-1 text-label-sm text-primary hover:underline"
              @click="openPreview('Gambar Program Studi', originalImages.programStudiImage)"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>
              Lihat Gambar Sebelumnya
            </button>
          </div>
          <FileInput v-model="form.programStudiImage" accept="image/*" preview />
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 space-y-4">
        <h2 class="font-semibold text-headline-md text-on-surface">Kenapa Memilih Kami</h2>
        <p class="text-body-sm text-on-surface-variant -mt-2">Foto latar kartu "Kehidupan Kampus" pada bento grid.</p>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-label-md text-on-surface">Gambar Kehidupan Kampus</span>
            <button
              type="button"
              class="flex items-center gap-1 text-label-sm text-primary hover:underline"
              @click="openPreview('Gambar Kehidupan Kampus', originalImages.kehidupanKampusImage)"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>
              Lihat Gambar Sebelumnya
            </button>
          </div>
          <FileInput v-model="form.kehidupanKampusImage" accept="image/*" preview />
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 space-y-4">
        <h2 class="font-semibold text-headline-md text-on-surface">Fasilitas Kampus</h2>
        <p class="text-body-sm text-on-surface-variant -mt-2">Tiga foto galeri fasilitas kampus.</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-label-md text-on-surface">Lab Pemrograman</span>
              <button
                type="button"
                class="text-on-surface-variant hover:text-primary transition-colors"
                title="Lihat gambar sebelumnya"
                @click="openPreview('Lab Pemrograman', originalImages.fasilitasLabImage)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
              </button>
            </div>
            <FileInput v-model="form.fasilitasLabImage" accept="image/*" preview />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-label-md text-on-surface">Gedung Kampus</span>
              <button
                type="button"
                class="text-on-surface-variant hover:text-primary transition-colors"
                title="Lihat gambar sebelumnya"
                @click="openPreview('Gedung Kampus', originalImages.fasilitasGedungImage)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
              </button>
            </div>
            <FileInput v-model="form.fasilitasGedungImage" accept="image/*" preview />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-label-md text-on-surface">Aula</span>
              <button
                type="button"
                class="text-on-surface-variant hover:text-primary transition-colors"
                title="Lihat gambar sebelumnya"
                @click="openPreview('Aula', originalImages.fasilitasAulaImage)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
              </button>
            </div>
            <FileInput v-model="form.fasilitasAulaImage" accept="image/*" preview />
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 space-y-4">
        <h2 class="font-semibold text-headline-md text-on-surface">Beasiswa</h2>
        <p class="text-body-sm text-on-surface-variant -mt-2">Dua gambar slider pada section Beasiswa.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-label-md text-on-surface">Slide 1</span>
              <button
                type="button"
                class="flex items-center gap-1 text-label-sm text-primary hover:underline"
                @click="openPreview('Beasiswa - Slide 1', originalImages.beasiswaSlide1Image)"
              >
                <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>
                Lihat Gambar Sebelumnya
              </button>
            </div>
            <FileInput v-model="form.beasiswaSlide1Image" accept="image/*" preview />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-label-md text-on-surface">Slide 2</span>
              <button
                type="button"
                class="flex items-center gap-1 text-label-sm text-primary hover:underline"
                @click="openPreview('Beasiswa - Slide 2', originalImages.beasiswaSlide2Image)"
              >
                <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>
                Lihat Gambar Sebelumnya
              </button>
            </div>
            <FileInput v-model="form.beasiswaSlide2Image" accept="image/*" preview />
          </div>
        </div>
      </section>

      <div v-if="canUpdate" class="flex justify-end pt-2">
        <AppButton type="submit" :disabled="submitting">{{ submitting ? 'Menyimpan...' : 'Simpan Perubahan' }}</AppButton>
      </div>
    </form>

    <Modal v-model="previewOpen" :title="previewLabel" size="lg">
      <div v-if="previewSrc" class="flex justify-center">
        <img :src="previewSrc" alt="Pratinjau gambar sebelumnya" class="max-w-full max-h-[60vh] rounded-lg border border-outline-variant object-contain" />
      </div>
      <p v-else class="text-body-sm text-on-surface-variant text-center py-8">
        Belum ada gambar custom untuk bagian ini — saat ini halaman Beranda memakai gambar bawaan.
      </p>
    </Modal>
  </div>
</template>
