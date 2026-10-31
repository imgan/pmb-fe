<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { calonMahasiswaApi } from '@/api/calonMahasiswa';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import type { CalonMahasiswa } from '@/types/entities';

/**
 * Popup Data Pendidikan (menu Peserta, ikon di kolom aksi). Nama asal sekolah selalu bisa diubah; isian lain disimpan
 * di biodata akun peserta tertaut (biodata dibuat otomatis bila belum ada).
 */
const props = defineProps<{ item: CalonMahasiswa | null; canUpdate: boolean }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [CalonMahasiswa] }>();

const jenisPengelolaanOptions = [
  { value: 'negeri', label: 'Negeri' },
  { value: 'swasta', label: 'Swasta' },
];
const form = reactive({ asalSekolah: '', jurusanSekolah: '', tahunLulus: '', jenisPengelolaanSekolah: '', alamatSekolah: '', nisn: '' });
const errors = reactive<Record<string, string>>({});
const busy = ref(false);

const adaAkun = computed(() => !!props.item?.pesertaId);
const catatan = computed(() => (adaAkun.value ? '' : 'Data ini belum ditautkan ke akun peserta — hanya nama asal sekolah yang bisa diisi.'));
const kunciLain = computed(() => !props.canUpdate || !adaAkun.value);

watch(open, (v) => {
  if (!v || !props.item) return;
  const b = props.item.peserta?.biodata;
  Object.assign(form, {
    // '-' = belum diisi saat Tambah Peserta.
    asalSekolah: props.item.asalSekolah === '-' ? '' : props.item.asalSekolah ?? '',
    jurusanSekolah: b?.jurusanSekolah ?? '',
    tahunLulus: b?.tahunLulus ?? '',
    jenisPengelolaanSekolah: b?.jenisPengelolaanSekolah ?? '',
    alamatSekolah: b?.alamatSekolah ?? '',
    nisn: b?.nisn ?? '',
  });
  Object.keys(errors).forEach((k) => delete errors[k]);
});

const simpan = async () => {
  if (!props.item) return;
  Object.keys(errors).forEach((k) => delete errors[k]);
  const isi = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as typeof form;
  if (!isi.asalSekolah) errors.asalSekolah = 'Nama asal sekolah wajib diisi';
  if (isi.tahunLulus && !/^\d{4}$/.test(isi.tahunLulus)) errors.tahunLulus = 'Tahun lulus harus 4 digit';
  if (isi.nisn && !/^\d{10}$/.test(isi.nisn)) errors.nisn = 'NISN harus 10 digit angka';
  if (Object.keys(errors).length) return;
  busy.value = true;
  try {
    const hasil = await calonMahasiswaApi.savePendidikan(props.item.id, {
      asalSekolah: isi.asalSekolah,
      ...(adaAkun.value
        ? {
            jurusanSekolah: isi.jurusanSekolah || null,
            tahunLulus: isi.tahunLulus || null,
            jenisPengelolaanSekolah: isi.jenisPengelolaanSekolah || null,
            alamatSekolah: isi.alamatSekolah || null,
            nisn: isi.nisn || null,
          }
        : {}),
    });
    toastSuccess('Data pendidikan disimpan');
    emit('saved', hasil);
    open.value = false;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan data pendidikan'));
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" title="Data Pendidikan" :subtitle="item ? item.nama : undefined" size="lg">
    <form class="space-y-4" @submit.prevent="simpan">
      <div v-if="catatan" class="px-3 py-2 rounded-md border border-[#eda100]/50 bg-[#eda100]/10 text-body-sm">{{ catatan }}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput v-model="form.asalSekolah" label="Nama Asal Sekolah" required :disabled="!canUpdate" :error="errors.asalSekolah" />
        <TextInput v-model="form.jurusanSekolah" label="Jurusan Asal Sekolah" :disabled="kunciLain" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <TextInput v-model="form.tahunLulus" label="Tahun Lulus" placeholder="mis. 2025" :disabled="kunciLain" :error="errors.tahunLulus" />
        <SelectInput v-model="form.jenisPengelolaanSekolah" label="Jenis Pengelolaan" :options="jenisPengelolaanOptions" :disabled="kunciLain" />
        <div class="md:col-span-2"><TextInput v-model="form.alamatSekolah" label="Alamat Sekolah" :disabled="kunciLain" /></div>
        <div class="md:col-span-2"><TextInput v-model="form.nisn" label="NISN" hint="10 digit" :disabled="kunciLain" :error="errors.nisn" /></div>
      </div>
    </form>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">{{ canUpdate ? 'Batal' : 'Tutup' }}</AppButton>
      <AppButton v-if="canUpdate" :disabled="busy" @click="simpan">{{ busy ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    </template>
  </Modal>
</template>
