<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { calonMahasiswaApi } from '@/api/calonMahasiswa';
import { sumberInformasiApi } from '@/api/sumberInformasi';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import type { CalonMahasiswa } from '@/types/entities';

/**
 * Popup Sumber Informasi (menu Data Calon Mahasiswa, ikon di sebelah Data Pendidikan — seperti aplikasi PMB lama):
 * mendapat informasi kampus dari, keterangan, kode unik, dan Kunci / Buka Kunci Data. Terkunci = isian hanya bisa dibaca.
 * Isian awal sumber informasi diambil dari pilihan peserta saat mendaftar bila belum diisi di sini.
 */
const props = defineProps<{ item: CalonMahasiswa | null; canUpdate: boolean }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [CalonMahasiswa] }>();

const opsi = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  try {
    opsi.value = (await sumberInformasiApi.list({ limit: 200 })).data.map((s) => ({ value: s.id, label: s.namaInformasi }));
  } catch {
    opsi.value = [];
  }
});

const form = reactive({ sumberInformasiId: '' as number | string | null, keteranganSumber: '', kodeUnik: '' });
const terkunci = ref(false);
const busy = ref(false);
watch(open, (v) => {
  if (!v || !props.item) return;
  const it = props.item;
  form.sumberInformasiId = it.sumberInformasiId ?? it.peserta?.sumberInformasiId ?? '';
  form.keteranganSumber = it.keteranganSumber ?? '';
  form.kodeUnik = it.kodeUnik ?? '';
  terkunci.value = !!it.sumberTerkunci;
});
const bolehUbah = computed(() => props.canUpdate && !terkunci.value);
const dariPendaftaran = computed(() => !props.item?.sumberInformasiId && !!props.item?.peserta?.sumberInformasiId);

const simpan = async () => {
  if (!props.item) return;
  busy.value = true;
  try {
    const hasil = await calonMahasiswaApi.saveSumberInformasi(props.item.id, {
      sumberInformasiId: form.sumberInformasiId ? Number(form.sumberInformasiId) : null,
      keteranganSumber: form.keteranganSumber.trim() || null,
      kodeUnik: form.kodeUnik.trim() || null,
    });
    toastSuccess('Sumber informasi disimpan');
    emit('saved', hasil);
    open.value = false;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan sumber informasi'));
  } finally {
    busy.value = false;
  }
};

const ubahKunci = async () => {
  if (!props.item) return;
  const kunci = !terkunci.value;
  const ok = await confirmAction({
    title: kunci ? 'Kunci data sumber informasi?' : 'Buka kunci data sumber informasi?',
    text: kunci ? 'Isian sumber informasi tidak bisa diubah sampai kuncinya dibuka.' : 'Isian sumber informasi dapat diubah kembali.',
    confirmLabel: kunci ? 'Kunci Data' : 'Buka Kunci',
    danger: false,
  });
  if (!ok) return;
  busy.value = true;
  try {
    const hasil = await calonMahasiswaApi.kunciSumber(props.item.id, kunci);
    terkunci.value = !!hasil.sumberTerkunci;
    toastSuccess(kunci ? 'Data sumber informasi dikunci' : 'Kunci data dibuka');
    emit('saved', hasil);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengubah status kunci'));
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" title="Sumber Informasi" :subtitle="item ? item.nama : undefined" size="xl">
    <form class="space-y-4" @submit.prevent="simpan">
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge :variant="terkunci ? 'neutral' : 'warning'" :label="terkunci ? 'Terkunci' : 'Terbuka'" />
        <span v-if="dariPendaftaran" class="text-label-sm text-on-surface-variant">Sumber informasi diambil dari pilihan peserta saat mendaftar.</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div class="md:col-span-4">
          <SelectInput v-model="form.sumberInformasiId" label="Mendapat Informasi Kampus Dari" :options="opsi" placeholder="Pilih sumber informasi" :disabled="!bolehUbah" />
        </div>
        <div class="md:col-span-5">
          <TextareaInput v-model="form.keteranganSumber" label="Keterangan" :rows="2" :disabled="!bolehUbah" placeholder="mis. nama teman / event / akun media sosial" />
        </div>
        <div class="md:col-span-3">
          <TextInput v-model="form.kodeUnik" label="Kode Unik" :disabled="!bolehUbah" placeholder="mis. 001" />
        </div>
      </div>
    </form>
    <template #footer>
      <AppButton v-if="canUpdate" variant="secondary" :icon="terkunci ? 'lock_open' : 'lock'" :disabled="busy" @click="ubahKunci">
        {{ terkunci ? 'Buka Kunci Data' : 'Kunci Data' }}
      </AppButton>
      <span class="flex-1" />
      <AppButton variant="secondary" @click="open = false">Tutup</AppButton>
      <AppButton v-if="bolehUbah" :disabled="busy" @click="simpan">{{ busy ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    </template>
  </Modal>
</template>
