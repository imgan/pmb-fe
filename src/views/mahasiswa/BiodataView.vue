<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { ukuranAlmamaterOptions } from '@/utils/almamater';
import AppButton from '@/components/ui/AppButton.vue';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { mahasiswaBiodataApi } from '@/api/mahasiswaPortal';
import type { MahasiswaBiodataPayload } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import { formatDate } from '@/utils/format';
import type { MahasiswaBiodata } from '@/types/entities';

// Opsi sama dengan modal Biodata Mahasiswa di modul Prodi/BAAK.
const agamaOptions = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu', 'Lainnya'].map((v) => ({ value: v, label: v }));
const jenisTinggalOptions = ['Orang Tua', 'Wali', 'Kos/Asrama', 'Rumah Sendiri', 'Lainnya'].map((v) => ({ value: v, label: v }));
const alatTransportasiOptions = ['Jalan Kaki', 'Kendaraan Pribadi', 'Angkutan Umum', 'Kendaraan Sekolah/Kampus', 'Lainnya'].map(
  (v) => ({ value: v, label: v })
);
const waktuKuliahOptions = ['Pagi', 'Siang', 'Malam'].map((v) => ({ value: v, label: v }));

const DATE_KEYS = ['tanggalLahir', 'tanggalLahirAyah', 'tanggalLahirIbu', 'tanggalLahirWali'];

// Hanya field yang boleh diubah mahasiswa. Field terkunci (NIM, kelas, data pendaftaran, prodi,
// status belajar/kuliah/dikti) tidak dikirim — backend juga membuangnya kalau terkirim.
const emptyForm = (): Record<string, string> => ({
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  noKtp: '',
  nisn: '',
  npwp: '',
  jalan: '',
  dusun: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kecamatan: '',
  kodePos: '',
  propinsi: '',
  jenisTinggal: '',
  alatTransportasi: '',
  teleponRumah: '',
  waktuKuliah: '',
  email: '',
  hp: '',
  almamater: '',
  terimaKps: '',
  noKps: '',
  nikAyah: '',
  namaAyah: '',
  tanggalLahirAyah: '',
  pendidikanAyah: '',
  pekerjaanAyah: '',
  penghasilanAyah: '',
  nikIbu: '',
  namaIbu: '',
  tanggalLahirIbu: '',
  pendidikanIbu: '',
  pekerjaanIbu: '',
  penghasilanIbu: '',
  namaWali: '',
  tanggalLahirWali: '',
  pendidikanWali: '',
  pekerjaanWali: '',
  penghasilanWali: '',
});

const mahasiswaAuthStore = useMahasiswaAuthStore();
const form = reactive(emptyForm());
const biodata = ref<MahasiswaBiodata | null>(null);
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);

const fillForm = (data: MahasiswaBiodata | null) => {
  biodata.value = data;
  Object.assign(form, emptyForm());
  if (!data) return;
  Object.keys(form).forEach((key) => {
    const value = (data as unknown as Record<string, string | number | null>)[key];
    form[key] = value === null || value === undefined ? '' : String(value);
  });
  DATE_KEYS.forEach((key) => {
    const value = (data as unknown as Record<string, string | null>)[key];
    form[key] = value?.slice(0, 10) ?? '';
  });
};

// Data akademik read-only: diisi BAAK/Prodi.
const lockedFields = computed(() => {
  const mhs = mahasiswaAuthStore.mahasiswa;
  const b = biodata.value;
  return [
    { label: 'NIM', value: mhs?.nim },
    { label: 'Program Studi', value: b?.programStudi || mhs?.jurusan?.namaJurusan },
    { label: 'Kelas', value: b?.kelas || mhs?.golonganKelas?.namaKelas },
    { label: 'Jalur Pendaftaran', value: b?.jalurPendaftaran },
    { label: 'Jenis Pendaftaran', value: b?.jenisPendaftaran },
    { label: 'Tgl Masuk Kuliah', value: b?.tanggalMasukKuliah ? formatDate(b.tanggalMasukKuliah) : null },
    { label: 'Mulai Semester', value: b?.mulaiSemester },
    { label: 'Status Belajar', value: b?.statusBelajar },
    { label: 'Status Kuliah', value: b?.statusKuliah },
    { label: 'Status Dikti', value: b?.statusDikti },
  ];
});

onMounted(async () => {
  try {
    const [data] = await Promise.all([mahasiswaBiodataApi.get(), mahasiswaAuthStore.loadProfile()]);
    fillForm(data);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat biodata');
  } finally {
    loading.value = false;
  }
});

// No KPS hanya tampil & wajib kalau "Terima KPS" = Ya.
const noKpsError = ref<string | null>(null);

const handleSave = async () => {
  noKpsError.value = null;
  if (form.terimaKps !== 'Ya') form.noKps = '';
  else if (!form.noKps.trim()) {
    noKpsError.value = 'No KPS wajib diisi untuk penerima KPS';
    toastError(noKpsError.value);
    return;
  }
  submitting.value = true;
  error.value = null;
  try {
    const payload: MahasiswaBiodataPayload = {};
    Object.entries(form).forEach(([key, value]) => {
      (payload as Record<string, string | null>)[key] = value.trim() || null;
    });
    fillForm(await mahasiswaBiodataApi.save(payload));
    toastSuccess('Biodata berhasil disimpan');
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan biodata');
    error.value = message;
    toastError(message);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Biodata</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Lengkapi dan perbarui biodata Anda.</p>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>

    <form v-else class="space-y-6" @submit.prevent="handleSave">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ error }}
      </div>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Data Akademik</div>
        <div class="p-6">
          <p class="text-body-sm text-on-surface-variant mb-4">
            Data berikut dikelola oleh BAAK/Prodi dan tidak dapat diubah. Hubungi BAAK jika ada kesalahan.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              v-for="field in lockedFields"
              :key="field.label"
              :model-value="field.value || '-'"
              :label="field.label"
              disabled
            />
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Data Pribadi</div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.tempatLahir" label="Tempat Lahir" />
            <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              v-model="form.jenisKelamin"
              label="Jenis Kelamin"
              placeholder="Pilih jenis kelamin..."
              :options="[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]"
            />
            <SelectInput v-model="form.agama" label="Agama" placeholder="Pilih agama..." :options="agamaOptions" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.noKtp" label="NIK" />
            <TextInput v-model="form.nisn" label="NISN" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.kewarganegaraan" label="Kewarganegaraan" />
            <TextInput v-model="form.npwp" label="NPWP" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput v-model="form.email" label="E-mail" type="email" />
            <TextInput v-model="form.hp" label="No HP" />
            <TextInput v-model="form.teleponRumah" label="Telp Rumah" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput v-model="form.almamater" label="Almamater (Ukuran)" placeholder="Pilih ukuran..." :options="ukuranAlmamaterOptions(form.almamater)" />
            <SelectInput v-model="form.waktuKuliah" label="Waktu Kuliah" placeholder="Pilih waktu..." :options="waktuKuliahOptions" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              v-model="form.terimaKps"
              label="Terima KPS"
              placeholder="Pilih..."
              :options="[{ value: 'Ya', label: 'Ya' }, { value: 'Tidak', label: 'Tidak' }]"
            />
            <TextInput
              v-if="form.terimaKps === 'Ya'"
              v-model="form.noKps"
              label="No KPS"
              required
              :error="noKpsError"
            />
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Alamat</div>
        <div class="p-6 space-y-4">
          <TextInput v-model="form.jalan" label="Jalan" />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput v-model="form.dusun" label="Dusun" />
            <TextInput v-model="form.rt" label="RT" />
            <TextInput v-model="form.rw" label="RW" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.kelurahan" label="Kelurahan" />
            <TextInput v-model="form.kecamatan" label="Kecamatan" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.kodePos" label="Kode Pos" />
            <TextInput v-model="form.propinsi" label="Propinsi" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput v-model="form.jenisTinggal" label="Jenis Tinggal" placeholder="Pilih jenis tinggal..." :options="jenisTinggalOptions" />
            <SelectInput
              v-model="form.alatTransportasi"
              label="Alat Transportasi"
              placeholder="Pilih alat transportasi..."
              :options="alatTransportasiOptions"
            />
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Data Orang Tua / Wali</div>
        <div class="p-6 space-y-6">
          <div>
            <p class="font-medium text-label-md text-on-surface mb-4">Data Ayah</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput v-model="form.nikAyah" label="NIK Ayah" />
              <TextInput v-model="form.namaAyah" label="Nama Ayah" />
              <DateInput v-model="form.tanggalLahirAyah" label="Tgl Lahir Ayah" />
              <TextInput v-model="form.pendidikanAyah" label="Pendidikan Ayah" />
              <TextInput v-model="form.pekerjaanAyah" label="Pekerjaan Ayah" />
              <TextInput v-model="form.penghasilanAyah" label="Penghasilan Ayah" />
            </div>
          </div>
          <div class="pt-4 border-t border-outline-variant">
            <p class="font-medium text-label-md text-on-surface mb-4">Data Ibu</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput v-model="form.nikIbu" label="NIK Ibu" />
              <TextInput v-model="form.namaIbu" label="Nama Ibu" />
              <DateInput v-model="form.tanggalLahirIbu" label="Tanggal Lahir Ibu" />
              <TextInput v-model="form.pendidikanIbu" label="Pendidikan Ibu" />
              <TextInput v-model="form.pekerjaanIbu" label="Pekerjaan Ibu" />
              <TextInput v-model="form.penghasilanIbu" label="Penghasilan Ibu" />
            </div>
          </div>
          <div class="pt-4 border-t border-outline-variant">
            <p class="font-medium text-label-md text-on-surface mb-4">Data Wali</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput v-model="form.namaWali" label="Nama Wali" />
              <DateInput v-model="form.tanggalLahirWali" label="Tanggal Lahir Wali" />
              <TextInput v-model="form.pendidikanWali" label="Pendidikan Wali" />
              <TextInput v-model="form.pekerjaanWali" label="Pekerjaan Wali" />
              <TextInput v-model="form.penghasilanWali" label="Penghasilan Wali" />
            </div>
          </div>
        </div>
      </section>

      <!-- Jenis Pembiayaan, Biaya Masuk & Data Transfer tidak ditampilkan di portal mahasiswa (dikelola BAAK/Keuangan). -->
      <div class="flex justify-end">
        <AppButton type="submit" icon="save" :disabled="submitting">
          {{ submitting ? 'Menyimpan...' : 'Simpan Biodata' }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
