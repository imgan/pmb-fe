<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/api/auth';
import { extractErrorMessage } from '@/api/http';

const route = useRoute();
const router = useRouter();

const token = (route.query.token as string) || '';
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const handleSubmit = async () => {
  error.value = null;

  if (!token) {
    error.value = 'Link reset password tidak valid. Silakan minta link baru.';
    return;
  }
  if (password.value.length < 8) {
    error.value = 'Password minimal 8 karakter';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Konfirmasi password tidak sama';
    return;
  }

  loading.value = true;
  try {
    await authApi.resetPassword(token, password.value);
    success.value = true;
    setTimeout(() => router.push({ name: 'login' }), 2500);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mereset password');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined" style="font-size: 28px">lock_reset</span>
        </div>
        <h1 class="font-semibold text-headline-lg text-primary">Reset Password</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Admin Console &mdash; University PMB System</p>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-6 space-y-4">
        <div v-if="success" class="space-y-4">
          <div class="px-3 py-2 rounded-md bg-success-container text-on-success-container text-body-sm">
            Password berhasil direset. Anda akan diarahkan ke halaman login&hellip;
          </div>
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="!token" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            Link reset password tidak valid atau tidak lengkap. Silakan minta link baru.
          </div>
          <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ error }}
          </div>

          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Password Baru</span>
            <input
              v-model="password"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </label>

          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Konfirmasi Password Baru</span>
            <input
              v-model="confirmPassword"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </label>

          <button
            type="submit"
            :disabled="loading || !token"
            class="w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan Password Baru' }}
          </button>

          <p class="text-center text-body-sm text-on-surface-variant pt-1">
            <RouterLink to="/admin/login" class="text-primary font-medium hover:underline">Kembali ke Login</RouterLink>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
