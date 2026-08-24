<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import FileInput from '@/components/ui/FileInput.vue';
import { kampusApi } from '@/api/kampus';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastSuccess, toastError } from '@/utils/swal';

const { canUpdate } = usePermission(MENU.KAMPUS_MANAGEMENT);

const loading = ref(true);
const submitting = ref(false);
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});

const form = reactive({
  namaKampus: '',
  alamat: '',
  telepon: '',
  kodePos: '',
  email: '',
  whatsappNumber: '',
  facebookUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  websiteTitle: '',
});

const load = async () => {
  loading.value = true;
  formError.value = null;
  try {
    const kampus = await kampusApi.get();
    if (kampus) {
      Object.assign(form, {
        namaKampus: kampus.namaKampus,
        alamat: kampus.alamat ?? '',
        telepon: kampus.telepon ?? '',
        kodePos: kampus.kodePos ?? '',
        email: kampus.email ?? '',
        whatsappNumber: kampus.whatsappNumber ?? '',
        facebookUrl: kampus.facebookUrl ?? '',
        instagramUrl: kampus.instagramUrl ?? '',
        youtubeUrl: kampus.youtubeUrl ?? '',
        logoUrl: kampus.logoUrl ?? null,
        faviconUrl: kampus.faviconUrl ?? null,
        websiteTitle: kampus.websiteTitle ?? '',
      });
    }
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal memuat profil kampus');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!form.namaKampus.trim()) errors.namaKampus = 'Nama kampus wajib diisi';
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  try {
    await kampusApi.update({
      namaKampus: form.namaKampus.trim(),
      alamat: form.alamat.trim() || null,
      telepon: form.telepon.trim() || null,
      kodePos: form.kodePos.trim() || null,
      email: form.email.trim() || null,
      whatsappNumber: form.whatsappNumber.trim() || null,
      facebookUrl: form.facebookUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      youtubeUrl: form.youtubeUrl.trim() || null,
      logoUrl: form.logoUrl,
      faviconUrl: form.faviconUrl,
      websiteTitle: form.websiteTitle.trim() || null,
    });
    toastSuccess('Profil kampus berhasil disimpan');
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan profil kampus');
    formError.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Profil Kampus" subtitle="Data ini tampil di header, footer, dan tombol WhatsApp website publik." />

    <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>

    <form v-else class="max-w-3xl bg-surface-container-lowest border border-outline-variant rounded-lg p-6 space-y-5" @submit.prevent="handleSubmit">
      <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ formError }}
      </div>

      <TextInput v-model="form.namaKampus" label="Nama Kampus" required :error="errors.namaKampus" :disabled="!canUpdate" />
      <TextareaInput v-model="form.alamat" label="Alamat" :rows="3" :disabled="!canUpdate" />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TextInput v-model="form.telepon" label="Telepon" :disabled="!canUpdate" />
        <TextInput v-model="form.kodePos" label="Kode Pos" :disabled="!canUpdate" />
      </div>

      <TextInput v-model="form.email" type="email" label="Email" :disabled="!canUpdate" />
      <TextInput
        v-model="form.whatsappNumber"
        label="Nomor WhatsApp"
        hint="Format internasional tanpa tanda +, contoh: 6281316455664. Dipakai untuk tombol chat WhatsApp di website."
        :disabled="!canUpdate"
      />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <TextInput v-model="form.facebookUrl" label="Facebook URL" placeholder="https://facebook.com/..." :disabled="!canUpdate" />
        <TextInput v-model="form.instagramUrl" label="Instagram URL" placeholder="https://instagram.com/..." :disabled="!canUpdate" />
        <TextInput v-model="form.youtubeUrl" label="YouTube URL" placeholder="https://youtube.com/..." :disabled="!canUpdate" />
      </div>

      <TextInput
        v-model="form.websiteTitle"
        label="Judul Website"
        placeholder="Home - PMB Politeknik Bhakti Kartini"
        hint="Judul yang tampil di tab browser (document title) website publik."
        :disabled="!canUpdate"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-outline-variant">
        <FileInput
          v-model="form.logoUrl"
          label="Logo Website"
          accept="image/*"
          preview
          hint="Tampil di header & footer website publik. Disarankan format persegi/transparan (PNG/SVG)."
        />
        <FileInput
          v-model="form.faviconUrl"
          label="Favicon"
          accept="image/*"
          preview
          hint="Ikon tab browser. Disarankan gambar persegi ukuran kecil (mis. 32x32 atau 64x64 px)."
        />
      </div>

      <div v-if="canUpdate" class="flex justify-end pt-2">
        <AppButton type="submit" :disabled="submitting">{{ submitting ? 'Menyimpan...' : 'Simpan Perubahan' }}</AppButton>
      </div>
    </form>
  </div>
</template>
