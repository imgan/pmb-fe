<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { calonMahasiswaApi } from '@/api/calonMahasiswa';
import { golonganKelasApi } from '@/api/golonganKelas';
import { jurusanApi } from '@/api/jurusan';
import { beasiswaApi } from '@/api/beasiswa';
import { gelombangApi } from '@/api/gelombang';
import { ukuranAlmamaterApi } from '@/api/ukuranAlmamater';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import type { CalonMahasiswa, Jurusan } from '@/types/entities';

/**
 * Popup Sumber Informasi 2 (menu Data Calon Mahasiswa, ikon di sebelah Sumber Informasi — seperti aplikasi PMB lama):
 * kelas perkuliahan, skema pembayaran, ukuran almamater, gelombang pendaftaran, jurusan pilihan 1–3, dan Kunci / Buka
 * Kunci Data. Isian kosong diambil dari pilihan peserta saat mendaftar (kelas, jurusan 1, beasiswa).
 */
const props = defineProps<{ item: CalonMahasiswa | null; canUpdate: boolean }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [CalonMahasiswa] }>();

type Opsi = { value: number | string; label: string }[];
const opsiKelas = ref<Opsi>([]);
const opsiBeasiswa = ref<Opsi>([]);
const opsiGelombang = ref<Opsi>([]);
const opsiUkuran = ref<Opsi>([]);
const semuaJurusan = ref<Jurusan[]>([]);

const labelJurusan = (j: Pick<Jurusan, 'namaJurusan' | 'jenjangPendidikan'>) =>
  j.jenjangPendidikan && !j.namaJurusan.startsWith(j.jenjangPendidikan) ? `${j.jenjangPendidikan} - ${j.namaJurusan}` : j.namaJurusan;

onMounted(async () => {
  const [kelas, beasiswa, gelombang, ukuran, jurusan] = await Promise.allSettled([
    golonganKelasApi.list({ limit: 200 }),
    beasiswaApi.list({ limit: 200 }),
    gelombangApi.list({ limit: 200 }),
    ukuranAlmamaterApi.list({ limit: 200 }),
    jurusanApi.list({ limit: 200 }),
  ]);
  if (kelas.status === 'fulfilled') opsiKelas.value = kelas.value.data.map((k) => ({ value: k.id, label: k.namaKelas }));
  if (beasiswa.status === 'fulfilled') opsiBeasiswa.value = beasiswa.value.data.map((b) => ({ value: b.id, label: b.namaBeasiswa }));
  if (gelombang.status === 'fulfilled') opsiGelombang.value = gelombang.value.data.map((g) => ({ value: g.id, label: g.namaGelombang }));
  if (ukuran.status === 'fulfilled') opsiUkuran.value = ukuran.value.data.map((u) => ({ value: u.ukuran, label: u.ukuran }));
  if (jurusan.status === 'fulfilled') semuaJurusan.value = jurusan.value.data;
});

const form = reactive({
  golonganKelasId: '' as number | string | null,
  beasiswaId: '' as number | string | null,
  ukuranAlmamater: '' as number | string | null,
  gelombangId: '' as number | string | null,
  jurusan1Id: '' as number | string | null,
  jurusan2Id: '' as number | string | null,
  jurusan3Id: '' as number | string | null,
});
const terkunci = ref(false);
const busy = ref(false);
watch(open, (v) => {
  if (!v || !props.item) return;
  const it = props.item;
  form.golonganKelasId = it.golonganKelasId ?? it.peserta?.golonganKelasId ?? '';
  form.beasiswaId = it.beasiswaId ?? it.peserta?.beasiswaId ?? '';
  form.ukuranAlmamater = it.ukuranAlmamater ?? '';
  form.gelombangId = it.gelombangId ?? '';
  // Jurusan 1 awal: prodi yang tampil di tabel (cocok nama + kelas), baru pilihan peserta saat mendaftar.
  const sesuaiProdi = semuaJurusan.value.find((j) => j.namaJurusan === it.prodi && (!form.golonganKelasId || j.golonganKelasId === Number(form.golonganKelasId)));
  form.jurusan1Id = it.jurusan1Id ?? sesuaiProdi?.id ?? it.peserta?.jurusanId ?? '';
  form.jurusan2Id = it.jurusan2Id ?? '';
  form.jurusan3Id = it.jurusan3Id ?? '';
  terkunci.value = !!it.dataPmbTerkunci;
});
const bolehUbah = computed(() => props.canUpdate && !terkunci.value);

// Jurusan per golongan kelas (varian Reguler/Karyawan/Malam); ganti kelas → kosongkan jurusan yang tidak cocok.
const opsiJurusan = computed(() =>
  semuaJurusan.value
    .filter((j) => !form.golonganKelasId || j.golonganKelasId === Number(form.golonganKelasId))
    .map((j) => ({ value: j.id, label: labelJurusan(j) }))
);
watch(
  () => form.golonganKelasId,
  () => {
    if (!semuaJurusan.value.length) return;
    for (const key of ['jurusan1Id', 'jurusan2Id', 'jurusan3Id'] as const) {
      if (form[key] && !opsiJurusan.value.some((o) => o.value === Number(form[key]))) form[key] = '';
    }
  }
);
const opsiJurusanUntuk = (key: 'jurusan1Id' | 'jurusan2Id' | 'jurusan3Id') => {
  const lain = (['jurusan1Id', 'jurusan2Id', 'jurusan3Id'] as const).filter((k) => k !== key).map((k) => Number(form[k]));
  return opsiJurusan.value.filter((o) => !lain.includes(o.value));
};

const angka = (v: number | string | null) => (v ? Number(v) : null);

const simpan = async () => {
  if (!props.item) return;
  busy.value = true;
  try {
    const hasil = await calonMahasiswaApi.saveDataPmb(props.item.id, {
      golonganKelasId: angka(form.golonganKelasId),
      beasiswaId: angka(form.beasiswaId),
      ukuranAlmamater: form.ukuranAlmamater ? String(form.ukuranAlmamater) : null,
      gelombangId: angka(form.gelombangId),
      jurusan1Id: angka(form.jurusan1Id),
      jurusan2Id: angka(form.jurusan2Id),
      jurusan3Id: angka(form.jurusan3Id),
    });
    toastSuccess('Data pendaftaran disimpan');
    emit('saved', hasil);
    open.value = false;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan data pendaftaran'));
  } finally {
    busy.value = false;
  }
};

const ubahKunci = async () => {
  if (!props.item) return;
  const kunci = !terkunci.value;
  const ok = await confirmAction({
    title: kunci ? 'Kunci data pendaftaran?' : 'Buka kunci data pendaftaran?',
    text: kunci ? 'Isian tidak bisa diubah sampai kuncinya dibuka.' : 'Isian dapat diubah kembali.',
    confirmLabel: kunci ? 'Kunci Data' : 'Buka Kunci',
    danger: false,
  });
  if (!ok) return;
  busy.value = true;
  try {
    const hasil = await calonMahasiswaApi.kunciDataPmb(props.item.id, kunci);
    terkunci.value = !!hasil.dataPmbTerkunci;
    toastSuccess(kunci ? 'Data pendaftaran dikunci' : 'Kunci data dibuka');
    emit('saved', hasil);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengubah status kunci'));
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" title="Sumber Informasi 2" :subtitle="item ? item.nama : undefined" size="xl">
    <form class="space-y-4" @submit.prevent="simpan">
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge :variant="terkunci ? 'neutral' : 'warning'" :label="terkunci ? 'Terkunci' : 'Terbuka'" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SelectInput v-model="form.golonganKelasId" label="Kelas Perkuliahan" :options="opsiKelas" placeholder="Pilih kelas" :disabled="!bolehUbah" />
        <SelectInput v-model="form.beasiswaId" label="Skema Pembayaran" :options="opsiBeasiswa" placeholder="Pembiayaan Mandiri" :disabled="!bolehUbah" />
        <SelectInput v-model="form.ukuranAlmamater" label="Ukuran Almamater" :options="opsiUkuran" placeholder="Pilih ukuran" :disabled="!bolehUbah" />
        <SelectInput v-model="form.gelombangId" label="Gelombang Pendaftaran" :options="opsiGelombang" placeholder="Pilih gelombang" :disabled="!bolehUbah" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectInput v-model="form.jurusan1Id" label="Jurusan 1" :options="opsiJurusanUntuk('jurusan1Id')" placeholder="Pilih jurusan" :disabled="!bolehUbah" />
        <SelectInput v-model="form.jurusan2Id" label="Jurusan 2" :options="opsiJurusanUntuk('jurusan2Id')" placeholder="Pilih jurusan" :disabled="!bolehUbah" />
        <SelectInput v-model="form.jurusan3Id" label="Jurusan 3" :options="opsiJurusanUntuk('jurusan3Id')" placeholder="Pilih jurusan" :disabled="!bolehUbah" />
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
