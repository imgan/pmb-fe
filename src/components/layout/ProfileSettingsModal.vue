<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import FileInput from '@/components/ui/FileInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import { authApi } from '@/api/auth';
import { extractErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { toastSuccess, toastError } from '@/utils/swal';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const authStore = useAuthStore();

// ---- Foto profil ----
const photo = ref<string | null>(null);
const photoError = ref<string | null>(null);
const photoSubmitting = ref(false);

const handleSavePhoto = async () => {
  photoSubmitting.value = true;
  photoError.value = null;
  try {
    const user = await authApi.updateProfile({ photo: photo.value });
    authStore.setUser(user);
    toastSuccess('Foto profil berhasil diperbarui');
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
    await authApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
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

const close = () => emit('update:modelValue', false);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    photo.value = authStore.user?.photo ?? null;
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
  <Modal :model-value="modelValue" title="Profil Saya" size="md" @update:model-value="close">
    <div class="space-y-6">
      <!-- Foto profil -->
      <section>
        <p class="font-medium text-label-md text-on-surface mb-3">Foto Profil</p>
        <div v-if="photoError" class="mb-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ photoError }}
        </div>
        <FileInput v-model="photo" accept="image/*" preview hint="Format gambar, mis. JPG atau PNG" />
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
          <TextInput
            v-model="passwordForm.oldPassword"
            type="password"
            label="Password Lama"
            required
            :error="passwordErrors.oldPassword"
          />
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
            <AppButton :disabled="passwordSubmitting" @click="handleChangePassword">
              {{ passwordSubmitting ? 'Menyimpan...' : 'Ubah Password' }}
            </AppButton>
          </div>
        </form>
      </section>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="close">Tutup</AppButton>
    </template>
  </Modal>
</template>
