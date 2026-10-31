<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { mahasiswaKtmApi, type KtmData } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

const ktm = ref<KtmData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const printing = ref(false);

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const longDate = (value: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const ttl = computed(() => {
  if (!ktm.value) return '-';
  const parts = [ktm.value.tempatLahir, ktm.value.tanggalLahir ? longDate(ktm.value.tanggalLahir) : null].filter(Boolean);
  return parts.length ? parts.join(', ') : '-';
});

const rows = computed(() =>
  ktm.value
    ? [
        { label: 'NIM', value: ktm.value.nim, strong: true },
        { label: 'Nama', value: ktm.value.namaLengkap, strong: true },
        { label: 'Prodi', value: ktm.value.programStudi ?? '-' },
        { label: 'Kelas', value: ktm.value.kelas ?? '-' },
        { label: 'TTL', value: ttl.value },
        { label: 'Angkatan', value: String(ktm.value.tahunMasuk) },
      ]
    : []
);

// Data yang belum lengkap tetap bisa dicetak, tapi diingatkan dulu supaya kartu tidak kosong.
const kekurangan = computed(() => {
  if (!ktm.value) return [];
  const list: string[] = [];
  if (!ktm.value.photo) list.push('foto (atur lewat menu profil di pojok kanan atas)');
  if (!ktm.value.tempatLahir || !ktm.value.tanggalLahir) list.push('tempat/tanggal lahir (menu Biodata)');
  return list;
});

onMounted(async () => {
  try {
    ktm.value = await mahasiswaKtmApi.get();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data KTM');
  } finally {
    loading.value = false;
  }
});

const handleCetak = async () => {
  printing.value = true;
  try {
    openBlob(await mahasiswaKtmApi.cetakPdf());
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen KTM'));
  } finally {
    printing.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-8 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Cetak KTM</h1>
        <p class="text-body-md text-on-surface-variant mt-1">
          Kartu Tanda Mahasiswa ukuran kartu ID (85,6 x 54 mm), sisi depan &amp; belakang.
        </p>
      </div>
      <AppButton v-if="ktm" icon="print" :disabled="printing" @click="handleCetak">
        {{ printing ? 'Membuka...' : 'Cetak KTM' }}
      </AppButton>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>
    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data...</div>

    <template v-else-if="ktm">
      <div
        v-if="kekurangan.length"
        class="mb-4 px-3 py-2 rounded-md bg-warning-container text-on-warning-container text-body-sm flex items-start gap-2"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">info</span>
        <span>Data KTM belum lengkap: {{ kekurangan.join('; ') }}.</span>
      </div>

      <!-- Pratinjau sisi depan; tampilan PDF dibuat semirip mungkin (lihat pmb-be/src/services/ktmPdf.service.js). -->
      <div class="w-full max-w-[428px] aspect-[85.6/54] rounded-xl overflow-hidden shadow-md border border-outline-variant bg-white flex flex-col">
        <div class="bg-[#8A6D1F] border-b-2 border-[#B8973A] px-4 py-2 flex items-center gap-3">
          <img
            v-if="ktm.kampus?.logoUrl"
            :src="ktm.kampus.logoUrl"
            alt="Logo kampus"
            class="h-8 w-8 object-cover object-left shrink-0"
          />
          <div class="min-w-0 text-white">
            <p class="text-[13px] font-bold uppercase truncate leading-tight">{{ ktm.kampus?.namaKampus ?? 'Politeknik' }}</p>
            <p class="text-[10px] tracking-[0.15em] leading-tight">KARTU TANDA MAHASISWA</p>
          </div>
        </div>

        <div class="flex-1 flex gap-4 px-4 py-3 min-h-0">
          <div class="w-[22%] aspect-[3/4] shrink-0 border border-[#B8973A] bg-surface-container overflow-hidden flex items-center justify-center">
            <img v-if="ktm.photo" :src="ktm.photo" alt="Foto mahasiswa" class="w-full h-full object-cover" />
            <span v-else class="text-[10px] text-on-surface-variant text-center">FOTO<br />3 x 4</span>
          </div>
          <dl class="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] content-start">
            <template v-for="r in rows" :key="r.label">
              <dt class="text-on-surface-variant">{{ r.label }}</dt>
              <dd class="truncate" :class="r.strong ? 'font-bold text-on-surface' : 'text-on-surface'">: {{ r.value }}</dd>
            </template>
          </dl>
        </div>

        <div class="bg-[#F9F5EA] px-4 py-1 text-right text-[10px] font-bold text-[#8A6D1F]">
          Berlaku s.d. {{ longDate(ktm.berlakuHingga) }}
        </div>
      </div>
    </template>
  </div>
</template>
