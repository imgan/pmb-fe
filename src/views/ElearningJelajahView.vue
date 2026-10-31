<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { dosenJelajahApi, mahasiswaJelajahApi, type JelajahQuery, type KontenJelajah } from '@/api/elearningSosial';
import MateriMedia from '@/components/elearning/MateriMedia.vue';
import { sampulKonten, youtubeEmbed } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { dataUrlToBlob, downloadBlob } from '@/utils/download';
import { formatDateTime } from '@/utils/format';
import { toastError } from '@/utils/swal';

/**
 * E-learning → Jelajah (dosen & mahasiswa; portal dari route meta): katalog materi & video dari kelas lain yang terbit
 * untuk peserta kelas / seluruh kampus. Cari, filter jenis, urutkan terbaru / terpopuler, lalu buka isinya.
 */
const route = useRoute();
const portal = route.meta.portal === 'mahasiswa' ? 'mahasiswa' : 'dosen';
const api = portal === 'mahasiswa' ? mahasiswaJelajahApi : dosenJelajahApi;

const LIMIT = 24;
const cari = ref('');
const jenis = ref<JelajahQuery['jenis']>('');
const urut = ref<NonNullable<JelajahQuery['urut']>>('terbaru');
const asal = ref<NonNullable<JelajahQuery['asal']>>('semua');
const list = ref<KontenJelajah[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadingLagi = ref(false);
const error = ref<string | null>(null);

const muat = async (lagi = false) => {
  if (lagi) loadingLagi.value = true;
  else loading.value = true;
  error.value = null;
  try {
    const hasil = await api.list({
      cari: cari.value.trim(),
      jenis: jenis.value,
      urut: urut.value,
      asal: asal.value,
      page: lagi ? page.value + 1 : 1,
      limit: LIMIT,
    });
    list.value = lagi ? [...list.value, ...hasil.data] : hasil.data;
    total.value = hasil.total;
    page.value = hasil.page;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat konten jelajah');
  } finally {
    loading.value = false;
    loadingLagi.value = false;
  }
};
onMounted(() => muat());
watch([jenis, urut, asal], () => muat());
// Cari: tunggu pengguna selesai mengetik.
let tundaCari: ReturnType<typeof setTimeout> | undefined;
watch(cari, () => {
  clearTimeout(tundaCari);
  tundaCari = setTimeout(() => muat(), 400);
});
const adaLagi = computed(() => list.value.length < total.value);

// ---- Detail ----
const open = ref(false);
const detail = ref<KontenJelajah | null>(null);
const buka = async (k: KontenJelajah) => {
  detail.value = null;
  open.value = true;
  try {
    detail.value = await api.detail(k.id);
    k.dilihat = detail.value.dilihat;
  } catch (err) {
    open.value = false;
    toastError(extractErrorMessage(err, 'Gagal membuka konten'));
  }
};
const embed = computed(() => (detail.value?.jenis === 'VIDEO' ? youtubeEmbed(detail.value.url) : null));
const unduh = () => detail.value?.lampiran && downloadBlob(dataUrlToBlob(detail.value.lampiran), detail.value.lampiranNama || 'lampiran');
const thumbnail = (k: KontenJelajah) => sampulKonten(k);
const ambilBerkas = (berkasId: number) => api.berkas(detail.value!.id, berkasId);
const JENIS = {
  MATERI: { label: 'Materi', icon: 'library_books', cls: 'bg-[#2563eb] text-white' },
  VIDEO: { label: 'Video', icon: 'smart_display', cls: 'bg-[#dc2626] text-white' },
} as const;
</script>

<template>
  <div>
    <PageHeader title="Jelajah" subtitle="Temukan materi & video dari kelas lain." />
    <ElearningShell :portal="portal">
      <div class="space-y-4">
        <!-- Filter -->
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[14rem]">
            <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size: 20px">search</span>
            <input
              v-model="cari"
              class="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
              placeholder="Cari judul, mata kuliah, dosen, kategori..."
            />
          </div>
          <div class="inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md whitespace-nowrap">
            <button
              v-for="f in [
                { key: '', label: 'Semua' },
                { key: 'MATERI', label: 'Materi' },
                { key: 'VIDEO', label: 'Video' },
              ] as const"
              :key="f.key"
              type="button"
              class="px-3 py-1.5 border-l border-outline-variant first:border-l-0"
              :class="jenis === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
              @click="jenis = f.key"
            >
              {{ f.label }}
            </button>
          </div>
          <select v-model="urut" class="px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm" aria-label="Urutkan">
            <option value="terbaru">Terbaru</option>
            <option value="populer">Terpopuler</option>
          </select>
          <label class="inline-flex items-center gap-2 text-body-sm cursor-pointer">
            <input v-model="asal" type="checkbox" true-value="semua" false-value="lain" class="accent-primary" />
            Termasuk kelas saya
          </label>
        </div>

        <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
        <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
        <div
          v-else-if="!list.length"
          class="p-10 flex flex-col items-center gap-2 text-center text-on-surface-variant rounded-xl border border-outline-variant bg-surface-container-lowest"
        >
          <span class="material-symbols-outlined text-primary" style="font-size: 40px">rocket_launch</span>
          <p class="text-body-sm">
            {{ cari || jenis ? 'Tidak ada konten yang cocok dengan pencarian.' : 'Belum ada materi / video dari kelas lain yang bisa dijelajahi.' }}
          </p>
          <button v-if="asal === 'lain'" type="button" class="text-primary text-label-md hover:underline" @click="asal = 'semua'">
            Tampilkan juga konten kelas saya
          </button>
        </div>
        <template v-else>
          <p class="text-label-md text-on-surface-variant">{{ total }} konten</p>
          <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
            <button
              v-for="k in list"
              :key="k.id"
              type="button"
              class="group text-left rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden hover:border-primary hover:shadow-md transition flex flex-col"
              @click="buka(k)"
            >
              <div class="relative aspect-video bg-surface-container overflow-hidden">
                <img
                  v-if="thumbnail(k)"
                  :src="thumbnail(k)!"
                  :alt="k.judul"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e40af] to-[#60a5fa]">
                  <span class="material-symbols-outlined text-white/90" style="font-size: 48px">{{ JENIS[k.jenis].icon }}</span>
                </div>
                <span class="absolute top-2 left-2 px-2 py-0.5 rounded text-label-sm font-medium inline-flex items-center gap-1" :class="JENIS[k.jenis].cls">
                  <span class="material-symbols-outlined" style="font-size: 14px">{{ JENIS[k.jenis].icon }}</span
                  >{{ JENIS[k.jenis].label }}
                </span>
                <span v-if="k.jenis === 'VIDEO'" class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span class="material-symbols-outlined text-white drop-shadow-lg" style="font-size: 56px; font-variation-settings: 'FILL' 1"
                    >play_circle</span
                  >
                </span>
              </div>
              <div class="p-3 flex flex-col gap-1.5 flex-1">
                <p class="font-semibold text-on-surface leading-snug line-clamp-2 group-hover:text-primary">{{ k.judul }}</p>
                <div class="flex items-center gap-2 min-w-0">
                  <MataKuliahIlustrasi
                    :nama="k.kelas.namaMataKuliah"
                    :kode="k.kelas.kodeMataKuliah"
                    :ikon="k.kelas.ikon"
                    ukuran="sm"
                    class="!w-7 !h-7 !rounded-md"
                  />
                  <p class="text-label-sm text-on-surface-variant truncate">{{ k.kelas.namaMataKuliah }} · {{ k.kelas.kelas }}</p>
                </div>
                <p v-if="k.dosen" class="text-label-sm text-on-surface-variant truncate">{{ k.dosen }}</p>
                <div v-if="k.kategori || k.tagline.length" class="flex flex-wrap gap-1">
                  <span v-if="k.kategori" class="px-1.5 rounded border border-outline-variant text-label-sm text-on-surface-variant">{{ k.kategori }}</span>
                  <span v-for="t in k.tagline.slice(0, 2)" :key="t" class="px-1.5 rounded bg-[#ccfbf1] text-[#115e59] text-label-sm font-medium">{{ t }}</span>
                </div>
                <div class="mt-auto pt-1 flex items-center gap-3 text-label-sm text-on-surface-variant">
                  <span class="inline-flex items-center gap-0.5"
                    ><span class="material-symbols-outlined" style="font-size: 15px">visibility</span>{{ k.dilihat }}</span
                  >
                  <span class="inline-flex items-center gap-0.5"
                    ><span class="material-symbols-outlined" style="font-size: 15px">favorite</span>{{ k.suka }}</span
                  >
                  <span class="ml-auto">{{ formatDateTime(k.createdAt).split(',')[0] }}</span>
                </div>
              </div>
            </button>
          </div>
          <div v-if="adaLagi" class="text-center">
            <AppButton variant="secondary" icon="expand_more" :disabled="loadingLagi" @click="muat(true)">{{
              loadingLagi ? 'Memuat...' : 'Muat lebih banyak'
            }}</AppButton>
          </div>
        </template>
      </div>
    </ElearningShell>

    <Modal
      v-model="open"
      :title="detail?.judul ?? 'Memuat...'"
      :subtitle="
        detail ? `${detail.kelas.kodeMataKuliah} — ${detail.kelas.namaMataKuliah} · Kelas ${detail.kelas.kelas}${detail.dosen ? ` · ${detail.dosen}` : ''}` : ''
      "
      size="xl"
    >
      <div v-if="!detail" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else class="space-y-4">
        <p v-if="detail.deskripsi" class="text-body-sm whitespace-pre-line">{{ detail.deskripsi }}</p>
        <div v-if="embed" class="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe :src="embed" class="w-full h-full" :title="detail.judul" allowfullscreen />
        </div>
        <a
          v-else-if="detail.url"
          :href="detail.url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 text-primary hover:underline text-body-sm break-all"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">open_in_new</span>{{ detail.url }}
        </a>
        <div v-if="detail.isi" class="rounded-lg border border-outline-variant p-4 text-body-sm whitespace-pre-line">{{ detail.isi }}</div>
        <MateriMedia
          v-if="detail.jenis === 'MATERI'"
          :video-urls="detail.videoUrls"
          :gambar="detail.gambar"
          :dokumen="detail.dokumen"
          :ambil="ambilBerkas"
        />
        <AppButton v-if="detail.lampiran" variant="secondary" icon="download" @click="unduh">Unduh {{ detail.lampiranNama || 'lampiran' }}</AppButton>
        <p class="text-label-sm text-on-surface-variant">
          {{ detail.kelas.tahunAjaran ? `TA ${detail.kelas.tahunAjaran} · ` : '' }}Diterbitkan {{ formatDateTime(detail.createdAt) }} · {{ detail.dilihat }}×
          dilihat
        </p>
      </div>
    </Modal>
  </div>
</template>
