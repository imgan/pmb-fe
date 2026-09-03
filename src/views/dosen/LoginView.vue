<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDosenAuthStore } from '@/stores/dosenAuth';
import { extractErrorMessage } from '@/api/http';

const identifier = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const dosenAuthStore = useDosenAuthStore();
const router = useRouter();
const route = useRoute();

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  try {
    const trimmed = identifier.value.trim();
    const isEmail = trimmed.includes('@');
    await dosenAuthStore.login({
      ...(isEmail ? { email: trimmed } : { nidn: trimmed }),
      password: password.value,
    });
    const redirect = (route.query.redirect as string) || '/dosen/kehadiran-mengajar';
    router.push(redirect);
  } catch (err) {
    error.value = extractErrorMessage(err, 'NIDN/email atau password salah');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface px-4 py-16">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined" style="font-size: 28px">school</span>
        </div>
        <h1 class="font-semibold text-headline-lg text-primary">Portal Dosen</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Masuk menggunakan NIDN/email &amp; password Anda.</p>
      </div>

      <form
        class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-6 space-y-4"
        @submit.prevent="handleSubmit"
      >
        <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ error }}
        </div>

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">NIDN / Email</span>
          <input
            v-model="identifier"
            type="text"
            required
            autocomplete="username"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </label>

        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Password</span>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </label>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
