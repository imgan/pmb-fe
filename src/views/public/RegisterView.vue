<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { publicApi } from '@/api/public';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { toastError } from '@/utils/swal';

const pesertaAuthStore = usePesertaAuthStore();

const golonganKelasOptions = ref<{ value: number; label: string }[]>([]);
const jurusanOptions = ref<{ value: number; label: string }[]>([]);

const form = reactive({
  namaLengkap: '',
  asalSekolah: '',
  golonganKelasId: '' as number | '',
  jurusanId: '' as number | '',
  noTelepon: '',
  email: '',
});
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);
const success = ref(false);

onMounted(async () => {
  const result = await publicApi.golonganKelas();
  golonganKelasOptions.value = result.map((g) => ({ value: g.id, label: g.namaKelas }));
});

const onGolonganKelasChange = async () => {
  form.jurusanId = '';
  jurusanOptions.value = [];
  if (!form.golonganKelasId) return;
  const result = await publicApi.jurusan(Number(form.golonganKelasId));
  jurusanOptions.value = result.map((j) => ({ value: j.id, label: j.namaJurusan }));
};

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!form.namaLengkap.trim()) errors.namaLengkap = 'Nama lengkap wajib diisi';
  if (!form.asalSekolah.trim()) errors.asalSekolah = 'Asal sekolah wajib diisi';
  if (!form.golonganKelasId) errors.golonganKelasId = 'Pilihan kelas perkuliahan wajib dipilih';
  if (!form.jurusanId) errors.jurusanId = 'Pilihan program studi wajib dipilih';
  if (!form.noTelepon.trim()) errors.noTelepon = 'Nomor telepon wajib diisi';
  if (!form.email.trim()) errors.email = 'Alamat email wajib diisi';
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  try {
    await pesertaAuthStore.register({
      namaLengkap: form.namaLengkap.trim(),
      asalSekolah: form.asalSekolah.trim(),
      golonganKelasId: Number(form.golonganKelasId),
      jurusanId: Number(form.jurusanId),
      noTelepon: form.noTelepon.trim(),
      email: form.email.trim(),
    });
    success.value = true;
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal melakukan pendaftaran');
    formError.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <main class="flex-1 w-full max-w-2xl mx-auto px-4 md:px-12 py-12 md:py-16">
      <div class="text-center mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">Formulir Pendaftaran</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          Lengkapi data di bawah ini untuk mendaftar. Password akun akan dikirimkan ke email Anda.
        </p>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-10">
        <div v-if="success" class="text-center py-8 flex flex-col items-center">
          <div class="w-16 h-16 bg-surface-container text-primary rounded-full flex items-center justify-center mb-6">
            <span class="material-symbols-outlined text-4xl filled">mark_email_read</span>
          </div>
          <h2 class="text-headline-md font-semibold text-primary mb-2">Pendaftaran Berhasil!</h2>
          <p class="text-body-md text-on-surface-variant max-w-md mb-8">
            Password akun Anda telah dikirim ke <strong>{{ form.email }}</strong>. Silakan cek email Anda, lalu masuk
            untuk melengkapi biodata pendaftaran.
          </p>
          <RouterLink
            to="/pendaftaran/masuk"
            class="inline-flex items-center gap-2 bg-primary text-on-primary font-semibold text-label-md px-8 py-3 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          >
            Masuk Sekarang
            <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
          </RouterLink>
        </div>

        <form v-else class="space-y-5" @submit.prevent="handleSubmit">
          <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ formError }}
          </div>

          <TextInput v-model="form.namaLengkap" label="Nama Lengkap" required :error="errors.namaLengkap" />
          <TextInput v-model="form.asalSekolah" label="Asal Sekolah" required :error="errors.asalSekolah" />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectInput
              v-model="form.golonganKelasId"
              label="Pilihan Kelas Perkuliahan"
              placeholder="Pilih kelas perkuliahan..."
              required
              :options="golonganKelasOptions"
              :error="errors.golonganKelasId"
              @change="onGolonganKelasChange"
            />
            <SelectInput
              v-model="form.jurusanId"
              label="Pilihan Program Studi"
              placeholder="Pilih jurusan..."
              required
              :options="jurusanOptions"
              :disabled="!form.golonganKelasId"
              :error="errors.jurusanId"
            />
          </div>

          <TextInput v-model="form.noTelepon" label="Nomor Telepon" required :error="errors.noTelepon" />
          <TextInput v-model="form.email" type="email" label="Alamat Email" required :error="errors.email" />

          <button
            type="submit"
            :disabled="submitting"
            class="w-full bg-primary text-on-primary font-semibold text-label-md py-3.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {{ submitting ? 'Memproses...' : 'Register' }}
          </button>

          <p class="text-center text-body-sm text-on-surface-variant pt-2">
            Sudah daftar?
            <RouterLink to="/pendaftaran/masuk" class="text-primary font-medium hover:underline">Masuk di sini</RouterLink>
          </p>
        </form>
      </div>
    </main>

    <PublicFooter />
  </div>
</template>
