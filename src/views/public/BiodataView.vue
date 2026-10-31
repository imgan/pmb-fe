<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import PesertaSidebar from '@/components/public/PesertaSidebar.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { pesertaAuthApi } from '@/api/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError } from '@/utils/swal';

const pesertaAuthStore = usePesertaAuthStore();
const router = useRouter();

const loading = ref(true);
const submitting = ref(false);
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
// Biodata terkunci setelah disimpan; hanya admin PMB yang bisa membuka kuncinya.
const terkunci = computed(() => !!pesertaAuthStore.peserta?.biodata?.isLocked);

const jenisKelaminOptions = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

const agamaOptions = [
  { value: 'Islam', label: 'Islam' },
  { value: 'Kristen', label: 'Kristen' },
  { value: 'Katolik', label: 'Katolik' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Buddha', label: 'Buddha' },
  { value: 'Khonghucu', label: 'Khonghucu' },
  { value: 'Lainnya', label: 'Lainnya' },
];

const form = reactive({
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '' as 'L' | 'P' | '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  nik: '',
  namaIbuKandung: '',
  jalan: '',
  rt: '',
  rw: '',
  desaKelurahan: '',
  provinsi: '',
  kabupaten: '',
  kecamatan: '',
  kodePos: '',
  noWhatsapp: '',
  jurusanSekolah: '',
  tahunLulus: '',
  jenisPengelolaanSekolah: '',
  alamatSekolah: '',
  nisn: '',
  isAgree: false,
});

const jenisPengelolaanOptions = [
  { value: 'negeri', label: 'Negeri' },
  { value: 'swasta', label: 'Swasta' },
];

onMounted(async () => {
  try {
    await pesertaAuthStore.refreshProfile();
    const biodata = pesertaAuthStore.peserta?.biodata;
    if (biodata) {
      Object.assign(form, {
        tempatLahir: biodata.tempatLahir ?? '',
        tanggalLahir: biodata.tanggalLahir?.slice(0, 10) ?? '',
        jenisKelamin: biodata.jenisKelamin ?? '',
        agama: biodata.agama ?? '',
        kewarganegaraan: biodata.kewarganegaraan ?? '',
        nik: biodata.nik ?? '',
        namaIbuKandung: biodata.namaIbuKandung ?? '',
        jalan: biodata.jalan ?? '',
        rt: biodata.rt ?? '',
        rw: biodata.rw ?? '',
        desaKelurahan: biodata.desaKelurahan ?? '',
        provinsi: biodata.provinsi ?? '',
        kabupaten: biodata.kabupaten ?? '',
        kecamatan: biodata.kecamatan ?? '',
        kodePos: biodata.kodePos ?? '',
        noWhatsapp: biodata.noWhatsapp ?? pesertaAuthStore.peserta?.noTelepon ?? '',
        jurusanSekolah: biodata.jurusanSekolah ?? '',
        tahunLulus: biodata.tahunLulus ?? '',
        jenisPengelolaanSekolah: biodata.jenisPengelolaanSekolah ?? '',
        alamatSekolah: biodata.alamatSekolah ?? '',
        nisn: biodata.nisn ?? '',
        isAgree: biodata.isAgree,
      });
    } else if (pesertaAuthStore.peserta) {
      form.noWhatsapp = pesertaAuthStore.peserta.noTelepon;
    }
  } finally {
    loading.value = false;
  }
});

const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!form.tempatLahir.trim()) errors.tempatLahir = 'Tempat lahir wajib diisi';
  if (!form.tanggalLahir) errors.tanggalLahir = 'Tanggal lahir wajib diisi';
  if (!form.jenisKelamin) errors.jenisKelamin = 'Jenis kelamin wajib dipilih';
  if (!form.agama) errors.agama = 'Agama wajib dipilih';
  if (!form.kewarganegaraan.trim()) errors.kewarganegaraan = 'Kewarganegaraan wajib diisi';
  if (!/^\d{16}$/.test(form.nik.trim())) errors.nik = 'NIK harus 16 digit angka';
  if (!form.noWhatsapp.trim()) errors.noWhatsapp = 'Nomor WhatsApp wajib diisi';
  if (form.tahunLulus.trim() && !/^[0-9]{4}$/.test(form.tahunLulus.trim())) errors.tahunLulus = 'Tahun lulus harus 4 digit';
  if (form.nisn.trim() && !/^[0-9]{10}$/.test(form.nisn.trim())) errors.nisn = 'NISN harus 10 digit angka';
  if (!form.isAgree) errors.isAgree = 'Anda harus menyetujui pernyataan di atas';
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  try {
    await pesertaAuthApi.saveBiodata({
      tempatLahir: form.tempatLahir.trim(),
      tanggalLahir: form.tanggalLahir,
      jenisKelamin: form.jenisKelamin as 'L' | 'P',
      agama: form.agama,
      kewarganegaraan: form.kewarganegaraan.trim(),
      nik: form.nik.trim(),
      namaIbuKandung: form.namaIbuKandung.trim(),
      jalan: form.jalan.trim(),
      rt: form.rt.trim(),
      rw: form.rw.trim(),
      desaKelurahan: form.desaKelurahan.trim(),
      provinsi: form.provinsi.trim(),
      kabupaten: form.kabupaten.trim(),
      kecamatan: form.kecamatan.trim(),
      kodePos: form.kodePos.trim(),
      noWhatsapp: form.noWhatsapp.trim(),
      jurusanSekolah: form.jurusanSekolah.trim(),
      tahunLulus: form.tahunLulus.trim(),
      jenisPengelolaanSekolah: form.jenisPengelolaanSekolah,
      alamatSekolah: form.alamatSekolah.trim(),
      nisn: form.nisn.trim(),
      isAgree: form.isAgree,
    });
    await pesertaAuthStore.refreshProfile();
    toastSuccess('Biodata berhasil disimpan dan dikunci');
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan biodata');
    formError.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};

const handleLogout = () => {
  pesertaAuthStore.logout();
  router.push('/');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <!-- Grid: judul di atas kolom isi, menu kiri & isi mulai di garis yang sama. -->
    <div class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-12 py-10 md:py-16 grid md:grid-cols-[15rem_minmax(0,1fr)] gap-x-10 gap-y-6 md:gap-y-0 content-start">
      <div class="md:col-start-2 w-full max-w-3xl text-center md:mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">Biodata Personal</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          Lengkapi biodata Anda untuk menyelesaikan proses pendaftaran.
        </p>
      </div>
      <PesertaSidebar class="md:row-start-2 self-start" />
      <main class="md:row-start-2 min-w-0 w-full max-w-3xl">
        <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>

        <form v-else class="space-y-8" @submit.prevent="handleSubmit">
          <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
            {{ formError }}
          </div>

          <div v-if="terkunci" class="px-4 py-3 rounded-lg border border-outline-variant bg-surface-container flex gap-3 items-start">
            <span class="material-symbols-outlined text-primary">lock</span>
            <p class="text-body-sm text-on-surface">
              Biodata Anda sudah tersimpan dan <b>dikunci</b>. Bila ada data yang perlu diperbaiki, hubungi admin PMB untuk membuka kunci.
            </p>
          </div>

          <fieldset :disabled="terkunci" class="space-y-8 min-w-0">

          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <h2 class="text-headline-md font-semibold text-primary mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span class="material-symbols-outlined">person</span> Data Personal
            </h2>
            <div class="space-y-5">
              <TextInput :model-value="pesertaAuthStore.peserta?.namaLengkap" label="Nama Lengkap" disabled />
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput v-model="form.tempatLahir" label="Tempat Lahir" required :error="errors.tempatLahir" />
                <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" required :error="errors.tanggalLahir" />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SelectInput
                  v-model="form.jenisKelamin"
                  label="Jenis Kelamin"
                  placeholder="Pilih jenis kelamin..."
                  required
                  :options="jenisKelaminOptions"
                  :error="errors.jenisKelamin"
                />
                <SelectInput
                  v-model="form.agama"
                  label="Agama"
                  placeholder="Pilih agama..."
                  required
                  :options="agamaOptions"
                  :error="errors.agama"
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput v-model="form.kewarganegaraan" label="Kewarganegaraan" required :error="errors.kewarganegaraan" />
                <TextInput
                  v-model="form.nik"
                  label="Nomor Induk Kependudukan"
                  required
                  :error="errors.nik"
                  hint="16 digit sesuai KTP/KK"
                />
              </div>
              <TextInput v-model="form.namaIbuKandung" label="Nama Ibu Kandung" :error="errors.namaIbuKandung" />
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <h2 class="text-headline-md font-semibold text-primary mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span class="material-symbols-outlined">home</span> Alamat
            </h2>
            <div class="space-y-5">
              <TextInput v-model="form.jalan" label="Jalan" :error="errors.jalan" />
              <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
                <TextInput v-model="form.rt" label="RT" :error="errors.rt" />
                <TextInput v-model="form.rw" label="RW" :error="errors.rw" />
                <div class="col-span-2 md:col-span-2">
                  <TextInput v-model="form.desaKelurahan" label="Desa / Kelurahan" :error="errors.desaKelurahan" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
                <TextInput v-model="form.provinsi" label="Provinsi" :error="errors.provinsi" />
                <TextInput v-model="form.kabupaten" label="Kabupaten" :error="errors.kabupaten" />
                <TextInput v-model="form.kecamatan" label="Kecamatan" :error="errors.kecamatan" />
                <TextInput v-model="form.kodePos" label="Kode Pos" :error="errors.kodePos" />
              </div>
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <h2 class="text-headline-md font-semibold text-primary mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span class="material-symbols-outlined">call</span> Kontak
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TextInput :model-value="pesertaAuthStore.peserta?.email" label="Email" disabled />
              <TextInput :model-value="pesertaAuthStore.peserta?.noTelepon" label="No. HP" disabled />
            </div>
            <div class="mt-5">
              <TextInput v-model="form.noWhatsapp" label="No. WhatsApp" required :error="errors.noWhatsapp" />
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <h2 class="text-headline-md font-semibold text-primary mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span class="material-symbols-outlined">school</span> Data Pendidikan
            </h2>
            <div class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput :model-value="pesertaAuthStore.peserta?.asalSekolah" label="Nama Asal Sekolah" disabled />
                <TextInput v-model="form.jurusanSekolah" label="Jurusan Asal Sekolah" />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <TextInput v-model="form.tahunLulus" label="Tahun Lulus" placeholder="mis. 2025" :error="errors.tahunLulus" />
                <SelectInput v-model="form.jenisPengelolaanSekolah" label="Jenis Pengelolaan" :options="jenisPengelolaanOptions" />
                <TextInput v-model="form.nisn" label="NISN" hint="10 digit" :error="errors.nisn" />
              </div>
              <TextInput v-model="form.alamatSekolah" label="Alamat Sekolah" />
            </div>
          </section>

          <div class="px-4 py-4 rounded-lg border-2 border-dashed border-error/40 bg-error-container/40">
            <CheckboxToggle
              v-model="form.isAgree"
              label="Data saya entrikan adalah benar dan valid"
              description="Apabila didapati data yang tidak valid di kemudian hari, saya siap bertanggung jawab terhadap akibat dari kekeliruan data yang saya entrikan."
            />
            <p v-if="errors.isAgree" class="mt-2 text-label-sm text-error">{{ errors.isAgree }}</p>
          </div>

          </fieldset>

          <button
            v-if="!terkunci"
            type="submit"
            :disabled="submitting"
            class="w-full bg-secondary-container text-on-secondary-container font-bold text-label-md py-3.5 rounded-lg shadow-sm hover:brightness-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            {{ submitting ? 'Menyimpan...' : 'Setujui Pernyataan dan Simpan Data' }}
          </button>

          <RouterLink
            to="/pendaftaran/dokumen"
            class="w-full bg-primary text-on-primary font-semibold text-label-md py-3.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[20px]">upload_file</span>
            Lanjut Upload Dokumen
          </RouterLink>

          <p class="text-center">
            <button type="button" class="text-body-sm text-on-surface-variant hover:text-error transition-colors" @click="handleLogout">
              Keluar dari akun
            </button>
          </p>
        </form>
      </main>
    </div>

    <PublicFooter />
  </div>
</template>
