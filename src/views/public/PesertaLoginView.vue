<script setup lang="ts">
import PasswordInput from '@/components/ui/PasswordInput.vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { extractErrorMessage } from '@/api/http';

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const pesertaAuthStore = usePesertaAuthStore();
const router = useRouter();
const route = useRoute();

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  try {
    await pesertaAuthStore.login(username.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || '/pendaftaran/biodata';
    // Masih memakai password awal (nomor HP) → wajib ganti password dulu.
    if (pesertaAuthStore.peserta?.wajibGantiPassword) router.push({ name: 'pendaftaran-ganti-password', query: { redirect } });
    else router.push(redirect);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Nomor HP/email atau password salah');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <main class="flex-1 flex items-center justify-center px-4 py-16">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined" style="font-size: 28px">login</span>
          </div>
          <h1 class="font-semibold text-headline-lg text-primary">Masuk Peserta</h1>
          <p class="text-body-md text-on-surface-variant mt-1">
            Masuk dengan <b>nomor HP</b> (atau email). Password awal = nomor HP yang didaftarkan.
          </p>
        </div>

        <form
          class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-6 space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ error }}
          </div>

          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Nomor HP atau Email</span>
            <input
              v-model="username"
              type="text"
              required
              autocomplete="username"
              placeholder="Contoh: 081234567890"
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </label>

          <label class="block">
            <div class="flex items-center justify-between mb-2">
              <span class="block font-medium text-label-md text-on-surface">Password</span>
              <RouterLink to="/pendaftaran/lupa-password" class="text-label-sm text-primary hover:underline">
                Lupa password?
              </RouterLink>
            </div>
            <PasswordInput v-model="password" required autocomplete="current-password" />
          </label>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>

          <p class="text-center text-body-sm text-on-surface-variant pt-1">
            Belum daftar?
            <RouterLink to="/pendaftaran" class="text-primary font-medium hover:underline">Daftar di sini</RouterLink>
          </p>
        </form>
      </div>
    </main>

    <PublicFooter />
  </div>
</template>
