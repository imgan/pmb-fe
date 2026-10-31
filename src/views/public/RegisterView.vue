<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import PesertaBiodataFields from '@/components/peserta/PesertaBiodataFields.vue';
import { biodataKosong, biodataPayload, validasiBiodata } from '@/components/peserta/biodataForm';
import { publicApi } from '@/api/public';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { toastError } from '@/utils/swal';

const pesertaAuthStore = usePesertaAuthStore();

const golonganKelasOptions = ref<{ value: number; label: string }[]>([]);
const jurusanOptions = ref<{ value: number; label: string }[]>([]);
const jalurOptions = ref<{ value: number | 'mandiri'; label: string }[]>([]);
const sumberInformasiOptions = ref<{ value: number; label: string }[]>([]);

const form = reactive({
  namaLengkap: '',
  asalSekolah: '',
  golonganKelasId: '' as number | '',
  jurusanId: '' as number | '',
  noTelepon: '',
  email: '',
  jalur: '' as number | 'mandiri' | '',
  sumberInformasiId: '' as number | '',
});
const errors = reactive<Record<string, string>>({});
// Biodata lengkap diisi sekaligus saat mendaftar (tersimpan & terkunci bersama akun).
const biodata = reactive(biodataKosong());
const biodataErrors = reactive<Record<string, string>>({});
const semuaError = computed(() => ({ ...errors, ...biodataErrors }));
const isAgree = ref(false);
// No. WhatsApp ikut No. HP selama belum diubah sendiri.
watch(
  () => form.noTelepon,
  (baru, lama) => {
    if (!biodata.noWhatsapp || biodata.noWhatsapp === lama) biodata.noWhatsapp = baru;
  }
);
const formError = ref<string | null>(null);
const submitting = ref(false);
const success = ref(false);

onMounted(async () => {
  const [kelas, beasiswa, sumber] = await Promise.all([publicApi.golonganKelas(), publicApi.beasiswaList(), publicApi.sumberInformasi()]);
  golonganKelasOptions.value = kelas.map((g) => ({ value: g.id, label: g.namaKelas }));
  jalurOptions.value = [...beasiswa.map((b) => ({ value: b.id, label: b.namaBeasiswa })), { value: 'mandiri', label: 'Pembiayaan Mandiri' }];
  sumberInformasiOptions.value = sumber.map((s) => ({ value: s.id, label: s.namaInformasi }));
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
  if (!form.jalur) errors.jalur = 'Jalur pendaftaran wajib dipilih';
  if (!form.sumberInformasiId) errors.sumberInformasiId = 'Sumber informasi wajib dipilih';
  if (!isAgree.value) errors.isAgree = 'Anda harus menyetujui pernyataan di atas';
  const biodataValid = validasiBiodata(biodata, biodataErrors);
  return Object.keys(errors).length === 0 && biodataValid;
};

const handleSubmit = async () => {
  if (!validate()) {
    formError.value = 'Masih ada data yang belum lengkap — periksa kolom yang ditandai merah.';
    return;
  }
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
      beasiswaId: form.jalur === 'mandiri' || !form.jalur ? null : Number(form.jalur),
      sumberInformasiId: form.sumberInformasiId ? Number(form.sumberInformasiId) : null,
      biodata: biodataPayload(biodata, isAgree.value),
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

    <main class="flex-1 w-full max-w-5xl mx-auto px-4 md:px-12 py-12 md:py-16">
      <div class="text-center mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">Formulir Pendaftaran</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          Lengkapi data di bawah ini untuk mendaftar. Setelah mendaftar, masuk menggunakan nomor HP sebagai username dan password awal.
        </p>
      </div>

      <div v-if="success" class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-10">
        <div class="text-center py-8 flex flex-col items-center">
          <div class="w-16 h-16 bg-surface-container text-primary rounded-full flex items-center justify-center mb-6">
            <span class="material-symbols-outlined text-4xl filled">mark_email_read</span>
          </div>
          <h2 class="text-headline-md font-semibold text-primary mb-2">Pendaftaran Berhasil!</h2>
          <p class="text-body-md text-on-surface-variant max-w-md mb-8">
            Masuk dengan <strong>nomor HP {{ form.noTelepon }}</strong> sebagai username <strong>dan</strong> password awal, lalu buat
            password baru dan upload dokumen pendaftaran. Detail akun juga dikirim ke <strong>{{ form.email }}</strong>.
          </p>
          <RouterLink
            to="/pendaftaran/masuk"
            class="inline-flex items-center gap-2 bg-primary text-on-primary font-semibold text-label-md px-8 py-3 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          >
            Masuk Sekarang
            <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
          </RouterLink>
        </div>
      </div>

      <form v-else class="space-y-8" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
          <h2 class="text-headline-md font-semibold text-primary mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
            <span class="material-symbols-outlined">school</span> Pilihan Pendaftaran
          </h2>
          <div class="space-y-5">
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
              <SelectInput
                v-model="form.jalur"
                label="Jalur Pendaftaran"
                placeholder="Pilih jalur..."
                required
                :options="jalurOptions"
                :error="errors.jalur"
              />
              <SelectInput
                v-model="form.sumberInformasiId"
                label="Tahu Kampus Dari"
                placeholder="Pilih sumber informasi..."
                required
                :options="sumberInformasiOptions"
                :error="errors.sumberInformasiId"
              />
            </div>
          </div>
        </section>

        <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
          <h2 class="text-headline-md font-semibold text-primary mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
            <span class="material-symbols-outlined">person</span> Biodata Personal
          </h2>
          <PesertaBiodataFields :form="biodata" :errors="semuaError" :akun="form" :sekolah="form" />
        </section>

        <div class="px-4 py-4 rounded-lg border-2 border-dashed border-error/40 bg-error-container/40">
          <CheckboxToggle
            v-model="isAgree"
            label="Data saya entrikan adalah benar dan valid"
            description="Apabila didapati data yang tidak valid di kemudian hari, saya siap bertanggung jawab terhadap akibat dari kekeliruan data yang saya entrikan."
          />
          <p v-if="errors.isAgree" class="mt-2 text-label-sm text-error">{{ errors.isAgree }}</p>
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-primary text-on-primary font-semibold text-label-md py-3.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {{ submitting ? 'Memproses...' : 'Daftar' }}
        </button>

        <p class="text-center text-body-sm text-on-surface-variant">
          Sudah daftar?
          <RouterLink to="/pendaftaran/masuk" class="text-primary font-medium hover:underline">Masuk di sini</RouterLink>
        </p>
      </form>
    </main>

    <PublicFooter />
  </div>
</template>
