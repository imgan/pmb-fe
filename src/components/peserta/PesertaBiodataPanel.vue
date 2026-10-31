<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { pesertaApi } from '@/api/peserta';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import type { Peserta } from '@/types/entities';
import PesertaBiodataFields from './PesertaBiodataFields.vue';
import { biodataKosong, biodataPayload, isiBiodataForm, validasiBiodata } from './biodataForm';

/**
 * Biodata personal peserta untuk admin PMB (menu Peserta): lihat, isi/ubah, hapus, dan kunci/buka kunci.
 * Biodata terkunci = peserta tidak bisa mengubahnya dari portal pendaftaran sampai kunci dibuka.
 */
const props = defineProps<{ pesertaId: number; canUpdate: boolean; canDelete: boolean }>();

const jenisKelaminOptions = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];
const peserta = ref<Peserta | null>(null);
const loading = ref(true);
const busy = ref(false);
const editing = ref(false);
const errors = reactive<Record<string, string>>({});

const form = reactive(biodataKosong());

const biodata = computed(() => peserta.value?.biodata ?? null);
const terkunci = computed(() => !!biodata.value?.isLocked);
const jenisKelaminLabel = computed(() => jenisKelaminOptions.find((o) => o.value === biodata.value?.jenisKelamin)?.label ?? '');

const load = async () => {
  loading.value = true;
  editing.value = false;
  try {
    peserta.value = await pesertaApi.get(props.pesertaId);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat biodata peserta'));
  } finally {
    loading.value = false;
  }
};
watch(() => props.pesertaId, load, { immediate: true });

const mulaiEdit = () => {
  isiBiodataForm(form, biodata.value, peserta.value?.noTelepon ?? '');
  Object.keys(errors).forEach((k) => delete errors[k]);
  editing.value = true;
};

const simpan = async () => {
  if (!validasiBiodata(form, errors)) return;
  busy.value = true;
  try {
    peserta.value = await pesertaApi.saveBiodata(props.pesertaId, biodataPayload(form, biodata.value?.isAgree ?? true));
    editing.value = false;
    toastSuccess('Biodata peserta disimpan');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan biodata'));
  } finally {
    busy.value = false;
  }
};

const ubahKunci = async () => {
  const kunci = !terkunci.value;
  const ok = await confirmAction({
    title: kunci ? 'Kunci biodata?' : 'Buka kunci biodata?',
    text: kunci
      ? 'Peserta tidak bisa mengubah biodatanya lagi.'
      : 'Peserta dapat memperbaiki biodatanya dari portal pendaftaran. Biodata terkunci lagi setelah peserta menyimpannya.',
    confirmLabel: kunci ? 'Kunci' : 'Buka Kunci',
    danger: false,
  });
  if (!ok) return;
  busy.value = true;
  try {
    peserta.value = await pesertaApi.setBiodataLock(props.pesertaId, kunci);
    toastSuccess(kunci ? 'Biodata dikunci' : 'Kunci biodata dibuka');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengubah status kunci'));
  } finally {
    busy.value = false;
  }
};

const hapus = async () => {
  const ok = await confirmAction({
    title: 'Hapus biodata peserta?',
    text: 'Seluruh biodata personal & alamat peserta ini dihapus. Peserta harus mengisinya ulang.',
    confirmLabel: 'Hapus',
  });
  if (!ok) return;
  busy.value = true;
  try {
    peserta.value = await pesertaApi.removeBiodata(props.pesertaId);
    toastSuccess('Biodata peserta dihapus');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus biodata'));
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <section class="border border-outline-variant rounded-lg overflow-hidden">
    <div class="px-4 py-3 bg-surface-bright border-b border-outline-variant flex flex-wrap items-center gap-2">
      <h3 class="font-semibold text-body-md text-on-surface mr-auto">Biodata Personal</h3>
      <StatusBadge v-if="biodata" :variant="terkunci ? 'neutral' : 'warning'" :label="terkunci ? 'Terkunci' : 'Terbuka untuk peserta'" />
    </div>

    <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat biodata...</div>

    <div v-else-if="!biodata && !editing" class="p-6 text-center">
      <p class="text-body-sm text-on-surface-variant mb-3">Peserta belum mengisi biodata.</p>
      <AppButton v-if="canUpdate" variant="secondary" icon="edit" @click="mulaiEdit">Isi Biodata</AppButton>
    </div>

    <div v-else class="p-4 space-y-5">
      <PesertaBiodataFields
        v-if="editing"
        :form="form"
        :errors="errors"
        :nama-lengkap="peserta?.namaLengkap"
        :email="peserta?.email"
        :no-telepon="peserta?.noTelepon"
        :asal-sekolah="peserta?.asalSekolah"
        tanpa-pendidikan
      />
      <template v-else>
        <TextInput :model-value="peserta?.namaLengkap" label="Nama Lengkap" disabled />
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TextInput :model-value="biodata?.tempatLahir" label="Tempat Lahir" disabled />
          <TextInput :model-value="formatDate(biodata?.tanggalLahir)" label="Tanggal Lahir" disabled />
          <TextInput :model-value="jenisKelaminLabel" label="Jenis Kelamin" disabled />
          <TextInput :model-value="biodata?.agama" label="Agama" disabled />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput :model-value="biodata?.kewarganegaraan" label="Kewarganegaraan" disabled />
          <TextInput :model-value="biodata?.nik" label="Nomor Induk Kependudukan" disabled />
          <TextInput :model-value="biodata?.namaIbuKandung" label="Nama Ibu Kandung" disabled />
        </div>
        <div class="border-t border-outline-variant pt-4 space-y-4">
          <p class="font-semibold text-body-md text-on-surface">Alamat</p>
          <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div class="col-span-2 md:col-span-3"><TextInput :model-value="biodata?.jalan" label="Jalan" disabled /></div>
            <TextInput :model-value="biodata?.rt" label="RT" disabled />
            <TextInput :model-value="biodata?.rw" label="RW" disabled />
            <div class="col-span-2 md:col-span-1"><TextInput :model-value="biodata?.desaKelurahan" label="Desa / Kelurahan" disabled /></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TextInput :model-value="biodata?.provinsi" label="Provinsi" disabled />
            <TextInput :model-value="biodata?.kabupaten" label="Kabupaten" disabled />
            <TextInput :model-value="biodata?.kecamatan" label="Kecamatan" disabled />
            <TextInput :model-value="biodata?.kodePos" label="Kode Pos" disabled />
          </div>
        </div>
        <div class="border-t border-outline-variant pt-4 space-y-4">
          <p class="font-semibold text-body-md text-on-surface">Kontak</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput :model-value="peserta?.email" label="Email" disabled />
            <TextInput :model-value="peserta?.noTelepon" label="No. HP" disabled />
            <TextInput :model-value="biodata?.noWhatsapp" label="No. WhatsApp" disabled />
          </div>
        </div>
        <!-- Data Pendidikan dilihat & diubah lewat ikon Data Pendidikan di tabel Peserta. -->
      </template>

      <div v-if="canUpdate || canDelete" class="flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-4">
        <template v-if="editing">
          <AppButton variant="secondary" :disabled="busy" @click="editing = false">Batal</AppButton>
          <AppButton icon="save" :disabled="busy" @click="simpan">{{ busy ? 'Menyimpan...' : 'Simpan Biodata' }}</AppButton>
        </template>
        <template v-else-if="biodata">
          <AppButton v-if="canDelete" variant="danger" icon="delete" :disabled="busy" @click="hapus">Hapus</AppButton>
          <AppButton v-if="canUpdate" variant="secondary" icon="edit" :disabled="busy" @click="mulaiEdit">Edit</AppButton>
          <AppButton v-if="canUpdate" :icon="terkunci ? 'lock_open' : 'lock'" :disabled="busy" @click="ubahKunci">
            {{ terkunci ? 'Buka Kunci Data' : 'Kunci Data' }}
          </AppButton>
        </template>
      </div>
    </div>
  </section>
</template>
