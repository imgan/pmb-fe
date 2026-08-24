<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '@/api/auth';
import { extractErrorMessage } from '@/api/http';

const email = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const sent = ref(false);

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  try {
    await authApi.forgotPassword(email.value);
    sent.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mengirim link reset password');
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
        <h1 class="font-semibold text-headline-lg text-primary">Lupa Password</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Admin Console &mdash; University PMB System</p>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-6 space-y-4">
        <div v-if="sent" class="space-y-4">
          <div class="px-3 py-2 rounded-md bg-success-container text-on-success-container text-body-sm">
            Jika email <strong>{{ email }}</strong> terdaftar, link reset password sudah dikirim. Silakan cek inbox
            (atau folder spam) email Anda.
          </div>
          <RouterLink
            to="/admin/login"
            class="block text-center w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity"
          >
            Kembali ke Login
          </RouterLink>
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <p class="text-body-sm text-on-surface-variant">
            Masukkan email akun Anda, kami akan mengirimkan link untuk membuat password baru.
          </p>

          <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ error }}
          </div>

          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Email</span>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </label>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {{ loading ? 'Mengirim...' : 'Kirim Link Reset Password' }}
          </button>

          <p class="text-center text-body-sm text-on-surface-variant pt-1">
            <RouterLink to="/admin/login" class="text-primary font-medium hover:underline">Kembali ke Login</RouterLink>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
