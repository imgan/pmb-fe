<script setup lang="ts">
import PasswordInput from '@/components/ui/PasswordInput.vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import { pesertaAuthApi } from '@/api/pesertaAuth';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess } from '@/utils/swal';

/**
 * Ganti password peserta PMB. Wajib dibuka saat akun masih memakai password awal (nomor HP) — router mengarahkan
 * ke sini sebelum halaman pendaftaran lain bisa diakses.
 */
const route = useRoute();
const router = useRouter();
const pesertaAuthStore = usePesertaAuthStore();
const wajib = computed(() => !!pesertaAuthStore.peserta?.wajibGantiPassword);

const passwordLama = ref('');
const passwordBaru = ref('');
const konfirmasi = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const simpan = async () => {
  error.value = null;
  if (passwordBaru.value.length < 8) return (error.value = 'Password baru minimal 8 karakter');
  if (passwordBaru.value !== konfirmasi.value) return (error.value = 'Konfirmasi password tidak sama');
  loading.value = true;
  try {
    pesertaAuthStore.peserta = await pesertaAuthApi.gantiPassword(passwordLama.value, passwordBaru.value);
    toastSuccess('Password berhasil diganti');
    router.push((route.query.redirect as string) || '/pendaftaran/biodata');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mengganti password');
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
            <span class="material-symbols-outlined" style="font-size: 28px">password</span>
          </div>
          <h1 class="font-semibold text-headline-lg text-primary">Ganti Password</h1>
          <p class="text-body-md text-on-surface-variant mt-1">
            {{ wajib ? 'Anda masih memakai password awal (nomor HP). Demi keamanan akun, buat password baru terlebih dahulu.' : 'Buat password baru untuk akun pendaftaran Anda.' }}
          </p>
        </div>

        <form class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-6 space-y-4" @submit.prevent="simpan">
          <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Password lama</span>
            <PasswordInput v-model="passwordLama" required autocomplete="current-password" :placeholder="wajib ? 'Nomor HP Anda' : ''" />
          </label>
          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Password baru</span>
            <PasswordInput v-model="passwordBaru" required autocomplete="new-password" placeholder="Minimal 8 karakter" />
          </label>
          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">Ulangi password baru</span>
            <PasswordInput v-model="konfirmasi" required autocomplete="new-password" />
          </label>
          <p class="text-label-sm text-on-surface-variant">Password baru tidak boleh sama dengan nomor HP.</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan Password' }}
          </button>
        </form>
      </div>
    </main>

    <PublicFooter />
  </div>
</template>
