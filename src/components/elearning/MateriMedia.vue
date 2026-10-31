<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { videoEmbed, type BerkasMateri } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { dataUrlToBlob, downloadBlob, openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/**
 * Isi media materi e-learning: galeri gambar, video (YouTube / Google Drive tertanam), dan daftar dokumen.
 * Dipakai halaman mahasiswa & pratinjau dosen; isi file diambil lewat `ambil` (endpoint berkas portal masing-masing).
 */
const props = defineProps<{
  videoUrls?: string[];
  gambar?: BerkasMateri[];
  dokumen?: BerkasMateri[];
  ambil: (berkasId: number) => Promise<{ nama: string; tipe: string | null; data: string }>;
}>();

// Gambar dimuat setelah tampil; disimpan sebagai object URL agar ringan.
const urlGambar = ref<Record<number, string>>({});
const bebaskan = () => Object.values(urlGambar.value).forEach((u) => URL.revokeObjectURL(u));
watch(
  () => props.gambar,
  async (list) => {
    bebaskan();
    urlGambar.value = {};
    for (const g of list ?? []) {
      try {
        const b = await props.ambil(g.id);
        urlGambar.value = { ...urlGambar.value, [g.id]: URL.createObjectURL(dataUrlToBlob(b.data)) };
      } catch {
        /* gambar gagal dimuat: tampil placeholder */
      }
    }
  },
  { immediate: true }
);
onBeforeUnmount(bebaskan);

const lihatGambar = (id: number) => {
  const u = urlGambar.value[id];
  if (u) window.open(u, '_blank', 'noopener');
};

const mengunduh = ref<number | null>(null);
const unduh = async (d: BerkasMateri) => {
  mengunduh.value = d.id;
  try {
    const b = await props.ambil(d.id);
    const blob = dataUrlToBlob(b.data);
    if (blob.type === 'application/pdf') openBlob(blob);
    else downloadBlob(blob, b.nama || d.nama);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh dokumen'));
  } finally {
    mengunduh.value = null;
  }
};

const ukuran = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const ikonDokumen = (nama: string) => {
  const e = nama.split('.').pop()?.toLowerCase() ?? '';
  return e === 'pdf' ? 'picture_as_pdf' : ['xls', 'xlsx'].includes(e) ? 'table_chart' : ['ppt', 'pptx'].includes(e) ? 'slideshow' : e === 'zip' ? 'folder_zip' : 'description';
};
</script>

<template>
  <div class="space-y-5">
    <section v-if="gambar?.length">
      <p class="text-label-md font-semibold text-on-surface mb-2">Gambar</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          v-for="g in gambar"
          :key="g.id"
          type="button"
          class="aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center"
          :title="g.nama"
          @click="lihatGambar(g.id)"
        >
          <img v-if="urlGambar[g.id]" :src="urlGambar[g.id]" :alt="g.nama" class="w-full h-full object-cover" />
          <span v-else class="material-symbols-outlined text-on-surface-variant animate-pulse">image</span>
        </button>
      </div>
    </section>

    <section v-if="videoUrls?.length" class="space-y-3">
      <p class="text-label-md font-semibold text-on-surface">Video</p>
      <div v-for="(v, i) in videoUrls" :key="`${i}-${v}`">
        <div v-if="videoEmbed(v)" class="aspect-video rounded-lg overflow-hidden border border-outline-variant bg-black">
          <iframe :src="videoEmbed(v)!" class="w-full h-full" :title="`Video ${i + 1}`" allow="autoplay; encrypted-media" allowfullscreen />
        </div>
        <a v-else :href="v" target="_blank" rel="noopener">
          <AppButton variant="secondary" icon="open_in_new">Buka Video {{ videoUrls.length > 1 ? i + 1 : '' }}</AppButton>
        </a>
      </div>
    </section>

    <section v-if="dokumen?.length">
      <p class="text-label-md font-semibold text-on-surface mb-2">Dokumen</p>
      <ul class="divide-y divide-outline-variant border border-outline-variant rounded-lg">
        <li v-for="d in dokumen" :key="d.id" class="flex items-center gap-3 px-3 py-2">
          <span class="material-symbols-outlined text-primary">{{ ikonDokumen(d.nama) }}</span>
          <span class="flex-1 min-w-0">
            <span class="block text-body-sm text-on-surface truncate">{{ d.nama }}</span>
            <span class="block text-label-sm text-on-surface-variant">{{ ukuran(d.ukuran) }}</span>
          </span>
          <AppButton variant="secondary" icon="download" :disabled="mengunduh === d.id" @click="unduh(d)">
            {{ mengunduh === d.id ? 'Memuat...' : 'Unduh' }}
          </AppButton>
        </li>
      </ul>
    </section>
  </div>
</template>
