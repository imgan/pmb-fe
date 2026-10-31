<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import FileInput from '@/components/ui/FileInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { dosenAuthApi } from '@/api/dosenAuth';
import { dosenTahunAkademikStorage } from '@/api/dosenHttp';
import { extractErrorMessage } from '@/api/http';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { toastSuccess, toastError } from '@/utils/swal';

/** Popup profil portal dosen: ubah foto profil & password (pola sama dengan portal mahasiswa). */
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const dosenAuthStore = useDosenAuthStore();

// ---- Foto profil ----
const MAX_BYTES = 2 * 1024 * 1024;
const photo = ref<string | null>(null);
const photoError = ref<string | null>(null);
const photoSubmitting = ref(false);

/** Perkiraan ukuran file dari panjang data URL base64. */
const ukuranBytes = (dataUrl: string) => Math.ceil(((dataUrl.split(',')[1] ?? '').length * 3) / 4);

const handleSavePhoto = async () => {
  photoError.value = null;
  if (photo.value && !/^data:image\/(png|jpe?g|webp);base64,/i.test(photo.value)) {
    photoError.value = 'Foto harus berupa gambar PNG, JPG, atau WEBP';
    return;
  }
  if (photo.value && ukuranBytes(photo.value) > MAX_BYTES) {
    photoError.value = 'Ukuran foto maksimal 2 MB';
    return;
  }
  photoSubmitting.value = true;
  try {
    const dosen = await dosenAuthApi.updatePhoto(photo.value);
    dosenAuthStore.setDosen(dosen);
    toastSuccess(photo.value ? 'Foto profil berhasil diperbarui' : 'Foto profil dihapus');
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal memperbarui foto profil');
    photoError.value = message;
    toastError(message);
  } finally {
    photoSubmitting.value = false;
  }
};

// ---- Ubah password ----
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });
const passwordErrors = reactive<Record<string, string>>({});
const passwordFormError = ref<string | null>(null);
const passwordSubmitting = ref(false);

const handleChangePassword = async () => {
  Object.keys(passwordErrors).forEach((k) => delete passwordErrors[k]);
  if (!passwordForm.oldPassword) passwordErrors.oldPassword = 'Password lama wajib diisi';
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
    passwordErrors.newPassword = 'Password baru minimal 8 karakter';
  }
  if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.confirmPassword = 'Konfirmasi password tidak cocok';
  }
  if (Object.keys(passwordErrors).length > 0) return;

  passwordSubmitting.value = true;
  passwordFormError.value = null;
  try {
    await dosenAuthApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    toastSuccess('Password berhasil diubah');
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal mengubah password');
    passwordFormError.value = message;
    toastError(message);
  } finally {
    passwordSubmitting.value = false;
  }
};

// ---- Setting tahun akademik ----
// Data portal (kelas, realisasi, silabus, KRS bimbingan, dashboard) ditampilkan untuk tahun akademik
// yang dipilih di sini — mis. untuk memeriksa / rollback data semester lalu.
const tahunAkademikOptions = ref<{ value: number; label: string }[]>([]);
const tahunAkademikId = ref<number | ''>('');
const tahunAkademikError = ref<string | null>(null);

const loadTahunAkademik = async () => {
  tahunAkademikId.value = dosenTahunAkademikStorage.get()?.id ?? '';
  if (tahunAkademikOptions.value.length) return;
  try {
    const list = await dosenAuthApi.listTahunAkademik();
    tahunAkademikOptions.value = list.map((t) => ({ value: t.id, label: t.isActive ? `${t.label} (aktif)` : t.label }));
  } catch (err) {
    tahunAkademikError.value = extractErrorMessage(err, 'Gagal memuat daftar tahun akademik');
  }
};

const handleTampilkanTahunAkademik = () => {
  const pilihan = tahunAkademikOptions.value.find((o) => o.value === tahunAkademikId.value);
  dosenTahunAkademikStorage.set(pilihan ? { id: pilihan.value, label: pilihan.label.replace(/ \(aktif\)$/, '') } : null);
  // Muat ulang supaya semua halaman mengambil data sesuai tahun akademik yang baru.
  window.location.reload();
};

const close = () => emit('update:modelValue', false);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    tahunAkademikError.value = null;
    loadTahunAkademik();
    photo.value = dosenAuthStore.dosen?.photo ?? null;
    photoError.value = null;
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    Object.keys(passwordErrors).forEach((k) => delete passwordErrors[k]);
    passwordFormError.value = null;
  }
);
</script>

<template>
  <Modal :model-value="modelValue" title="Profil Saya" :subtitle="dosenAuthStore.dosen?.namaLengkap ?? ''" size="md" @update:model-value="close">
    <div class="space-y-6">
      <!-- Setting tahun akademik -->
      <section>
        <p class="font-medium text-label-md text-on-surface mb-1">Setting Tahun Akademik</p>
        <p class="text-body-sm text-on-surface-variant mb-3">
          Pilih tahun akademik yang ingin ditampilkan untuk memeriksa data maupun aktivitas data semester lain.
        </p>
        <div v-if="tahunAkademikError" class="mb-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ tahunAkademikError }}
        </div>
        <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div class="flex-1">
            <SelectInput
              v-model="tahunAkademikId"
              label="Tahun Akademik"
              placeholder="Semua Tahun Akademik"
              :options="tahunAkademikOptions"
            />
          </div>
          <AppButton icon="filter_alt" @click="handleTampilkanTahunAkademik">Tampilkan</AppButton>
        </div>
      </section>

      <div class="border-t border-outline-variant" />

      <!-- Foto profil -->
      <section>
        <p class="font-medium text-label-md text-on-surface mb-3">Foto Profil</p>
        <div v-if="photoError" class="mb-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ photoError }}
        </div>
        <FileInput v-model="photo" accept="image/png,image/jpeg,image/webp" preview hint="Format JPG, PNG, atau WEBP, maksimal 2 MB" />
        <div class="flex justify-end mt-3">
          <AppButton :disabled="photoSubmitting" @click="handleSavePhoto">
            {{ photoSubmitting ? 'Menyimpan...' : 'Simpan Foto' }}
          </AppButton>
        </div>
      </section>

      <div class="border-t border-outline-variant" />

      <!-- Ubah password -->
      <section>
        <p class="font-medium text-label-md text-on-surface mb-3">Ubah Password</p>
        <div v-if="passwordFormError" class="mb-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ passwordFormError }}
        </div>
        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <TextInput v-model="passwordForm.oldPassword" type="password" label="Password Lama" required :error="passwordErrors.oldPassword" />
          <TextInput
            v-model="passwordForm.newPassword"
            type="password"
            label="Password Baru"
            required
            hint="Minimal 8 karakter"
            :error="passwordErrors.newPassword"
          />
          <TextInput
            v-model="passwordForm.confirmPassword"
            type="password"
            label="Konfirmasi Password Baru"
            required
            :error="passwordErrors.confirmPassword"
          />
          <div class="flex justify-end">
            <AppButton type="submit" :disabled="passwordSubmitting">
              {{ passwordSubmitting ? 'Menyimpan...' : 'Ubah Password' }}
            </AppButton>
          </div>
        </form>
      </section>
    </div>
  </Modal>
</template>
