<script setup lang="ts">
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import type { BiodataForm } from './biodataForm';

/**
 * Field biodata peserta yang bisa diedit (Biodata Personal, Alamat, Kontak). Nama/email/HP tampil dari akun peserta,
 * atau bisa diketik bila `akun` diberikan (form pendaftaran publik).
 */
defineProps<{
  form: BiodataForm;
  errors: Record<string, string>;
  namaLengkap?: string;
  email?: string;
  noTelepon?: string;
  akun?: { namaLengkap: string; email: string; noTelepon: string };
  /** Nama asal sekolah (tersimpan di akun peserta): bisa diketik bila `sekolah` diberikan, selain itu tampil dari `asalSekolah`. */
  sekolah?: { asalSekolah: string };
  asalSekolah?: string;
  /** Sembunyikan bagian Data Pendidikan (diubah lewat popup Data Pendidikan di menu Peserta). */
  tanpaPendidikan?: boolean;
}>();

const jenisPengelolaanOptions = [
  { value: 'negeri', label: 'Negeri' },
  { value: 'swasta', label: 'Swasta' },
];

const jenisKelaminOptions = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];
const agamaOptions = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu', 'Lainnya'].map((a) => ({ value: a, label: a }));
</script>

<template>
  <div class="space-y-5">
    <TextInput v-if="akun" v-model="akun.namaLengkap" label="Nama Lengkap" required :error="errors.namaLengkap" />
    <TextInput v-else :model-value="namaLengkap" label="Nama Lengkap" disabled />
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <TextInput v-model="form.tempatLahir" label="Tempat Lahir" required :error="errors.tempatLahir" />
      <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" required :error="errors.tanggalLahir" />
      <SelectInput v-model="form.jenisKelamin" label="Jenis Kelamin" required :options="jenisKelaminOptions" :error="errors.jenisKelamin" />
      <SelectInput v-model="form.agama" label="Agama" required :options="agamaOptions" :error="errors.agama" />
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TextInput v-model="form.kewarganegaraan" label="Kewarganegaraan" required :error="errors.kewarganegaraan" />
      <TextInput v-model="form.nik" label="Nomor Induk Kependudukan" required :error="errors.nik" hint="16 digit sesuai KTP/KK" />
      <TextInput v-model="form.namaIbuKandung" label="Nama Ibu Kandung" :error="errors.namaIbuKandung" />
    </div>

    <div class="border-t border-outline-variant pt-4 space-y-4">
      <p class="font-semibold text-body-md text-on-surface">Alamat</p>
      <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div class="col-span-2 md:col-span-3"><TextInput v-model="form.jalan" label="Jalan" :error="errors.jalan" /></div>
        <TextInput v-model="form.rt" label="RT" :error="errors.rt" />
        <TextInput v-model="form.rw" label="RW" :error="errors.rw" />
        <div class="col-span-2 md:col-span-1"><TextInput v-model="form.desaKelurahan" label="Desa / Kelurahan" :error="errors.desaKelurahan" /></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TextInput v-model="form.provinsi" label="Provinsi" :error="errors.provinsi" />
        <TextInput v-model="form.kabupaten" label="Kabupaten" :error="errors.kabupaten" />
        <TextInput v-model="form.kecamatan" label="Kecamatan" :error="errors.kecamatan" />
        <TextInput v-model="form.kodePos" label="Kode Pos" :error="errors.kodePos" />
      </div>
    </div>

    <div class="border-t border-outline-variant pt-4 space-y-4">
      <p class="font-semibold text-body-md text-on-surface">Kontak</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <template v-if="akun">
          <TextInput v-model="akun.email" type="email" label="Email" required :error="errors.email" />
          <TextInput v-model="akun.noTelepon" label="No. HP" required :error="errors.noTelepon" hint="Dipakai sebagai password awal (username = email)" />
        </template>
        <template v-else>
          <TextInput :model-value="email" label="Email" disabled />
          <TextInput :model-value="noTelepon" label="No. HP" disabled />
        </template>
        <TextInput v-model="form.noWhatsapp" label="No. WhatsApp" required :error="errors.noWhatsapp" />
      </div>
    </div>

    <div v-if="!tanpaPendidikan" class="border-t border-outline-variant pt-4 space-y-4">
      <p class="font-semibold text-body-md text-on-surface">Data Pendidikan</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput v-if="sekolah" v-model="sekolah.asalSekolah" label="Nama Asal Sekolah" required :error="errors.asalSekolah" />
        <TextInput v-else :model-value="asalSekolah" label="Nama Asal Sekolah" disabled />
        <TextInput v-model="form.jurusanSekolah" label="Jurusan Asal Sekolah" :error="errors.jurusanSekolah" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <TextInput v-model="form.tahunLulus" label="Tahun Lulus" placeholder="mis. 2025" :error="errors.tahunLulus" />
        <div class="md:col-span-1">
          <SelectInput v-model="form.jenisPengelolaanSekolah" label="Jenis Pengelolaan" :options="jenisPengelolaanOptions" />
        </div>
        <div class="md:col-span-2"><TextInput v-model="form.alamatSekolah" label="Alamat Sekolah" :error="errors.alamatSekolah" /></div>
        <div class="md:col-span-2"><TextInput v-model="form.nisn" label="NISN" hint="10 digit" :error="errors.nisn" /></div>
      </div>
    </div>
  </div>
</template>
