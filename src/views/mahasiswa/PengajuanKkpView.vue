<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { mahasiswaKkpApi, type FormKkp } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Pendaftaran Kuliah Kerja Praktek (Pengajuan → KKP). Satu pendaftaran per tahun ajaran aktif,
 * masuk ke data Nilai Magang prodi; bisa diubah selama nilai belum diisi.
 */
const data = ref<FormKkp | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);
const editing = ref(false);

const emptyForm = () => ({
  judul: '',
  perusahaan: '',
  alamat: '',
  email: '',
  telepon: '',
  pembimbingMagangId: '' as number | '',
  semester: '' as number | '',
});
const form = ref(emptyForm());

const isiForm = () => {
  const p = data.value?.pendaftaran;
  form.value = p
    ? {
        judul: p.judul ?? '',
        perusahaan: p.perusahaan ?? '',
        alamat: p.alamat ?? '',
        email: p.email ?? '',
        telepon: p.telepon ?? '',
        pembimbingMagangId: p.pembimbingMagangId ?? '',
        semester: p.semester ?? data.value!.semesterBerjalan,
      }
    : { ...emptyForm(), semester: data.value?.semesterBerjalan ?? '' };
};

onMounted(async () => {
  try {
    data.value = await mahasiswaKkpApi.getForm();
    isiForm();
    editing.value = !data.value.pendaftaran;
  } catch (err) {
    loadError.value = extractErrorMessage(err, 'Gagal memuat form KKP');
  } finally {
    loading.value = false;
  }
});

const semesterOptions = computed(() => {
  const max = Math.max(data.value?.semesterBerjalan ?? 8, 8);
  return Array.from({ length: max }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));
});

const simpan = async () => {
  const f = form.value;
  if (!f.judul.trim()) return (error.value = 'Judul KKP wajib diisi');
  if (!f.perusahaan.trim()) return (error.value = 'Perusahaan wajib diisi');
  if (!f.semester) return (error.value = 'Semester wajib dipilih');
  saving.value = true;
  error.value = null;
  try {
    const pendaftaran = await mahasiswaKkpApi.save({
      judul: f.judul.trim(),
      perusahaan: f.perusahaan.trim(),
      alamat: f.alamat.trim() || null,
      email: f.email.trim() || null,
      telepon: f.telepon.trim() || null,
      pembimbingMagangId: f.pembimbingMagangId || null,
      semester: Number(f.semester),
    });
    data.value = { ...data.value!, pendaftaran };
    editing.value = false;
    toastSuccess('Pendaftaran KKP disimpan');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan pendaftaran KKP');
  } finally {
    saving.value = false;
  }
};

const batal = () => {
  isiForm();
  error.value = null;
  if (data.value?.pendaftaran) editing.value = false;
};
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Pendaftaran KKP</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Kuliah Kerja Praktek<span v-if="data"> &middot; Tahun Ajaran {{ data.tahunAjaran.label }}</span>
      </p>
    </header>

    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
    <div v-else-if="loadError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ loadError }}</div>

    <section v-else-if="data" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden max-w-3xl">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between gap-3">
        <span>{{ editing ? (data.pendaftaran ? 'Ubah Pendaftaran' : 'Formulir Pendaftaran') : 'Data Pendaftaran' }}</span>
        <span v-if="data.pendaftaran && !editing" class="text-label-sm opacity-90">Terdaftar</span>
      </div>

      <dl class="px-4 py-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-body-sm border-b border-outline-variant">
        <dt class="text-on-surface-variant">NIM</dt>
        <dd class="text-on-surface">{{ data.mahasiswa.nim }}</dd>
        <dt class="text-on-surface-variant">Nama</dt>
        <dd class="text-on-surface">{{ data.mahasiswa.namaLengkap }}</dd>
        <dt class="text-on-surface-variant">Program Studi</dt>
        <dd class="text-on-surface">{{ data.mahasiswa.prodi }}</dd>
      </dl>

      <!-- Form daftar / ubah -->
      <form v-if="editing" class="p-4 space-y-4" @submit.prevent="simpan">
        <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
        <TextareaInput v-model="form.judul" label="Judul KKP" required :rows="3" />
        <TextInput v-model="form.perusahaan" label="Perusahaan / Instansi" required />
        <TextareaInput v-model="form.alamat" label="Alamat (Jalan)" :rows="3" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.email" label="E-Mail Perusahaan" type="email" />
          <TextInput v-model="form.telepon" label="Telepon Perusahaan" type="tel" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SelectInput
              v-model="form.pembimbingMagangId"
              label="Pembimbing"
              placeholder="--pilih--"
              :options="data.pembimbingOptions"
              :disabled="!data.pembimbingOptions.length"
            />
            <p v-if="!data.pembimbingOptions.length" class="mt-1 text-label-sm text-on-surface-variant">
              Belum ada daftar pembimbing — pembimbing akan ditentukan prodi.
            </p>
          </div>
          <SelectInput v-model="form.semester" label="Semester" placeholder="--pilih--" required :options="semesterOptions" />
        </div>
        <div class="flex gap-2 pt-2">
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
          <AppButton variant="secondary" type="button" @click="batal">Batal</AppButton>
        </div>
      </form>

      <!-- Ringkasan pendaftaran -->
      <div v-else-if="data.pendaftaran" class="p-4 space-y-4">
        <dl class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-body-sm">
          <dt class="text-on-surface-variant">Judul KKP</dt>
          <dd class="text-on-surface whitespace-pre-line">{{ data.pendaftaran.judul }}</dd>
          <dt class="text-on-surface-variant">Perusahaan</dt>
          <dd class="text-on-surface">{{ data.pendaftaran.perusahaan }}</dd>
          <dt class="text-on-surface-variant">Alamat</dt>
          <dd class="text-on-surface whitespace-pre-line">{{ data.pendaftaran.alamat || '-' }}</dd>
          <dt class="text-on-surface-variant">E-Mail</dt>
          <dd class="text-on-surface">{{ data.pendaftaran.email || '-' }}</dd>
          <dt class="text-on-surface-variant">Telepon</dt>
          <dd class="text-on-surface">{{ data.pendaftaran.telepon || '-' }}</dd>
          <dt class="text-on-surface-variant">Pembimbing</dt>
          <dd class="text-on-surface">{{ data.pendaftaran.pembimbing || 'Belum ditentukan' }}</dd>
          <template v-if="data.pendaftaran.pembimbingLapangan">
            <dt class="text-on-surface-variant">Pemb. Lapangan</dt>
            <dd class="text-on-surface">{{ data.pendaftaran.pembimbingLapangan }}</dd>
          </template>
          <dt class="text-on-surface-variant">Semester</dt>
          <dd class="text-on-surface">{{ data.pendaftaran.semester ?? '-' }}</dd>
          <template v-if="data.pendaftaran.tanggalMulai">
            <dt class="text-on-surface-variant">Periode</dt>
            <dd class="text-on-surface">
              {{ formatDate(data.pendaftaran.tanggalMulai) }} – {{ data.pendaftaran.tanggalSelesai ? formatDate(data.pendaftaran.tanggalSelesai) : '...' }}
            </dd>
          </template>
          <template v-if="data.pendaftaran.nilai !== null">
            <dt class="text-on-surface-variant">Nilai</dt>
            <dd class="text-on-surface font-semibold">{{ data.pendaftaran.nilai }} ({{ data.pendaftaran.grade ?? '-' }})</dd>
          </template>
        </dl>
        <AppButton v-if="data.pendaftaran.bisaDiubah" variant="secondary" icon="edit" @click="editing = true">Ubah Pendaftaran</AppButton>
        <p v-else class="text-body-sm text-on-surface-variant">Nilai KKP sudah diisi prodi, pendaftaran tidak dapat diubah lagi.</p>
      </div>
    </section>
  </div>
</template>
