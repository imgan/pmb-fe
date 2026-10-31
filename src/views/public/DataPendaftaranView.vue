<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import PesertaSidebar from '@/components/public/PesertaSidebar.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { pesertaAuthApi, type PesertaDataPmb } from '@/api/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Data Pendaftaran di portal peserta: isian yang sama dengan popup Sumber Informasi 2 di menu Peserta (admin).
 * Setelah admin mengunci data, isian hanya bisa dibaca.
 */
const pesertaAuthStore = usePesertaAuthStore();
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const data = ref<PesertaDataPmb | null>(null);

const form = reactive({
  golonganKelasId: '' as number | string | null,
  beasiswaId: '' as number | string | null,
  ukuranAlmamater: '' as number | string | null,
  gelombangId: '' as number | string | null,
  jurusan1Id: '' as number | string | null,
  jurusan2Id: '' as number | string | null,
  jurusan3Id: '' as number | string | null,
});

const isiForm = (d: PesertaDataPmb) => {
  data.value = d;
  pesertaAuthStore.dataPmbTersimpan = d.tersimpan;
  form.golonganKelasId = d.golonganKelasId ?? '';
  form.beasiswaId = d.beasiswaId ?? '';
  form.ukuranAlmamater = d.ukuranAlmamater ?? '';
  form.gelombangId = d.gelombangId ?? '';
  form.jurusan1Id = d.jurusan1Id ?? '';
  form.jurusan2Id = d.jurusan2Id ?? '';
  form.jurusan3Id = d.jurusan3Id ?? '';
};

onMounted(async () => {
  try {
    isiForm(await pesertaAuthApi.getMyDataPmb());
  } catch (err) {
    loadError.value = extractErrorMessage(err, 'Gagal memuat data pendaftaran');
  } finally {
    loading.value = false;
  }
});

const terkunci = computed(() => !!data.value?.terkunci);
const opsiKelas = computed(() => data.value?.opsi.kelas.map((k) => ({ value: k.id, label: k.namaKelas })) ?? []);
const opsiBeasiswa = computed(() => data.value?.opsi.beasiswa.map((b) => ({ value: b.id, label: b.namaBeasiswa })) ?? []);
const opsiGelombang = computed(() => data.value?.opsi.gelombang.map((g) => ({ value: g.id, label: g.namaGelombang })) ?? []);
const opsiUkuran = computed(() => data.value?.opsi.ukuran.map((u) => ({ value: u.ukuran, label: u.ukuran })) ?? []);

// Jurusan per golongan kelas (varian Reguler/Karyawan/Malam); ganti kelas → kosongkan jurusan yang tidak cocok.
const opsiJurusan = computed(() =>
  (data.value?.opsi.jurusan ?? [])
    .filter((j) => !form.golonganKelasId || j.golonganKelasId === Number(form.golonganKelasId))
    .map((j) => ({
      value: j.id,
      label: j.jenjangPendidikan && !j.namaJurusan.startsWith(j.jenjangPendidikan) ? `${j.jenjangPendidikan} - ${j.namaJurusan}` : j.namaJurusan,
    }))
);
watch(
  () => form.golonganKelasId,
  () => {
    if (!data.value) return;
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
  if (!form.golonganKelasId || !form.jurusan1Id) {
    toastError('Kelas perkuliahan dan Jurusan 1 wajib dipilih.');
    return;
  }
  saving.value = true;
  try {
    isiForm(
      await pesertaAuthApi.saveMyDataPmb({
        golonganKelasId: angka(form.golonganKelasId),
        beasiswaId: angka(form.beasiswaId),
        ukuranAlmamater: form.ukuranAlmamater ? String(form.ukuranAlmamater) : null,
        gelombangId: angka(form.gelombangId),
        jurusan1Id: angka(form.jurusan1Id),
        jurusan2Id: angka(form.jurusan2Id),
        jurusan3Id: angka(form.jurusan3Id),
      })
    );
    toastSuccess('Data pendaftaran disimpan');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan data pendaftaran'));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <!-- Grid: judul di atas kolom isi, menu kiri & isi mulai di garis yang sama. -->
    <div class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-12 py-10 md:py-16 grid md:grid-cols-[15rem_minmax(0,1fr)] gap-x-10 gap-y-6 md:gap-y-0 content-start">
      <div class="md:col-start-2 w-full max-w-3xl text-center md:mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">Data Pendaftaran</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          Pilih kelas perkuliahan, skema pembayaran, ukuran almamater, gelombang, dan jurusan pilihan Anda.
        </p>
      </div>
      <PesertaSidebar class="md:row-start-2 self-start" />
      <main class="md:row-start-2 min-w-0 w-full max-w-3xl">
        <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>
        <div v-else-if="loadError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ loadError }}
        </div>

        <form
          v-else
          class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 md:p-8 space-y-5"
          @submit.prevent="simpan"
        >
          <p v-if="terkunci" class="flex items-start gap-2 px-3 py-2 rounded-md bg-surface-container text-body-sm text-on-surface-variant">
            <span class="material-symbols-outlined" style="font-size: 18px">lock</span>
            Data ini sudah dikunci oleh panitia PMB dan hanya bisa dilihat. Hubungi panitia bila ada perubahan.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput v-model="form.golonganKelasId" label="Kelas Perkuliahan" required :options="opsiKelas" placeholder="Pilih kelas" :disabled="terkunci" />
            <SelectInput v-model="form.beasiswaId" label="Skema Pembayaran" :options="opsiBeasiswa" placeholder="Pembiayaan Mandiri" :disabled="terkunci" />
            <SelectInput v-model="form.ukuranAlmamater" label="Ukuran Almamater" :options="opsiUkuran" placeholder="Pilih ukuran" :disabled="terkunci" />
            <SelectInput v-model="form.gelombangId" label="Gelombang Pendaftaran" :options="opsiGelombang" placeholder="Pilih gelombang" :disabled="terkunci" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectInput v-model="form.jurusan1Id" label="Jurusan 1" required :options="opsiJurusanUntuk('jurusan1Id')" placeholder="Pilih jurusan" :disabled="terkunci" />
            <SelectInput v-model="form.jurusan2Id" label="Jurusan 2" :options="opsiJurusanUntuk('jurusan2Id')" placeholder="Pilih jurusan" :disabled="terkunci" />
            <SelectInput v-model="form.jurusan3Id" label="Jurusan 3" :options="opsiJurusanUntuk('jurusan3Id')" placeholder="Pilih jurusan" :disabled="terkunci" />
          </div>
          <button
            v-if="!terkunci"
            type="submit"
            :disabled="saving"
            class="w-full bg-primary text-on-primary font-semibold text-label-md py-3.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </form>
      </main>
    </div>

    <PublicFooter />
  </div>
</template>
