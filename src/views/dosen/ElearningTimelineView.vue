<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import KontenPreviewModal from '@/components/elearning/KontenPreviewModal.vue';
import { dosenElearningApi, youtubeThumbnail, type JenisKonten, type KontenRingkas } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';

/**
 * E-learning → Timeline & Berita: linimasa semua konten yang dibagikan di kelas-kelas yang diampu dosen (tahun akademik
 * terpilih), terbaru di atas dan dikelompokkan per tanggal. Klik item untuk pratinjau.
 */
type Item = KontenRingkas & { mataKuliah: string; kelasNama: string };
const items = ref<Item[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const katalog = await dosenElearningApi.kontenSaya();
    items.value = katalog
      .flatMap((g) => g.konten.map((k) => ({ ...k, mataKuliah: `${g.kelas.kodeMataKuliah} — ${g.kelas.namaMataKuliah}`, kelasNama: g.kelas.kelas })))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat timeline');
  } finally {
    loading.value = false;
  }
});

const JENIS: Record<JenisKonten, { label: string; icon: string; cls: string; aksi: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', cls: 'bg-[#2563eb]/10 text-[#1e40af]', aksi: 'membagikan materi' },
  VIDEO: { label: 'Video', icon: 'smart_display', cls: 'bg-[#d83b3b]/10 text-[#a32020]', aksi: 'membagikan video' },
  KUIS: { label: 'Kuis', icon: 'quiz', cls: 'bg-[#7c3aed]/10 text-[#5b21b6]', aksi: 'membuat kuis' },
  TUGAS: { label: 'Tugas', icon: 'assignment', cls: 'bg-[#0891b2]/10 text-[#0e7490]', aksi: 'memberikan tugas' },
};

// Kelompok per tanggal: "Hari ini", "Kemarin", atau tanggal lengkap.
const kunciTanggal = (iso: string) => new Date(iso).toDateString();
const labelTanggal = (iso: string) => {
  const d = new Date(iso);
  const hari = new Date();
  const kemarin = new Date();
  kemarin.setDate(hari.getDate() - 1);
  if (d.toDateString() === hari.toDateString()) return 'Hari ini';
  if (d.toDateString() === kemarin.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const kelompok = computed(() => {
  const map = new Map<string, { label: string; items: Item[] }>();
  items.value.forEach((it) => {
    const k = kunciTanggal(it.createdAt);
    if (!map.has(k)) map.set(k, { label: labelTanggal(it.createdAt), items: [] });
    map.get(k)!.items.push(it);
  });
  return [...map.values()];
});
const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const previewOpen = ref(false);
const pilihan = ref<Item | null>(null);
const buka = (it: Item) => {
  pilihan.value = it;
  previewOpen.value = true;
};
</script>

<template>
  <div>
    <PageHeader title="Timeline & Berita" subtitle="Aktivitas terbaru materi, video, dan kuis di kelas-kelas Anda." />
    <ElearningShell>
      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else-if="!items.length" class="p-10 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
        <span class="material-symbols-outlined block mb-2 text-on-surface-variant/60" style="font-size: 48px">newspaper</span>
        Belum ada aktivitas. Konten yang Anda bagikan di kelas akan muncul di sini.
      </div>
      <div v-else class="space-y-8 max-w-3xl">
        <section v-for="g in kelompok" :key="g.label">
          <h2 class="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide mb-3">{{ g.label }}</h2>
          <ol class="relative border-l-2 border-outline-variant ml-3 space-y-4">
            <li v-for="it in g.items" :key="it.id" class="pl-6 relative">
              <span class="absolute -left-[13px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-surface" :class="JENIS[it.jenis].cls">
                <span class="material-symbols-outlined" style="font-size: 14px">{{ JENIS[it.jenis].icon }}</span>
              </span>
              <button
                type="button"
                class="w-full text-left rounded-xl border border-outline-variant bg-surface-container-lowest p-4 hover:border-primary hover:shadow-sm transition flex gap-4"
                @click="buka(it)"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-body-sm text-on-surface-variant">
                    <span class="font-semibold text-on-surface">{{ it.namaDosen ?? 'Anda' }}</span> {{ JENIS[it.jenis].aksi }} di
                    <span class="font-medium text-on-surface">Kelas {{ it.kelasNama }}</span> · {{ jam(it.createdAt) }}
                  </p>
                  <p class="mt-1 font-semibold text-on-surface">{{ it.judul }}</p>
                  <p class="text-label-sm text-on-surface-variant">{{ it.mataKuliah }}</p>
                  <p v-if="it.deskripsi" class="mt-1.5 text-body-sm text-on-surface line-clamp-2">{{ it.deskripsi }}</p>
                  <div class="mt-2 flex flex-wrap gap-1.5 text-label-sm">
                    <span v-if="it.isWajib" class="px-2 py-0.5 rounded bg-[#d83b3b] text-white font-semibold">Wajib</span>
                    <span v-for="t in it.tagline" :key="t" class="px-2 py-0.5 rounded bg-[#d1f0ec] text-[#0f5f56] font-semibold">{{ t }}</span>
                    <span v-if="it.kategori" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">{{ it.kategori }}</span>
                    <span v-if="!it.isPublished" class="px-2 py-0.5 rounded bg-[#eda100]/20 text-[#7a5200]">Draf</span>
                    <span class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant inline-flex items-center gap-1">
                      <span class="material-symbols-outlined" style="font-size: 13px">visibility</span>{{ it.dilihat.total }}× dilihat
                    </span>
                    <span v-if="it.jenis === 'KUIS'" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">
                      {{ it.sudahMengerjakan }}/{{ it.jumlahPenerima }} mengerjakan
                    </span>
                    <span v-if="it.jenis === 'KUIS' && it.tenggat" class="px-2 py-0.5 rounded border border-outline-variant text-[#b4690e]">Batas {{ formatDateTime(it.tenggat) }}</span>
                  </div>
                </div>
                <img
                  v-if="it.jenis === 'VIDEO' && youtubeThumbnail(it.url)"
                  :src="youtubeThumbnail(it.url)!"
                  :alt="it.judul"
                  class="hidden sm:block w-36 aspect-video object-cover rounded-lg self-start"
                  loading="lazy"
                />
              </button>
            </li>
          </ol>
        </section>
      </div>
    </ElearningShell>
    <KontenPreviewModal v-model="previewOpen" :konten-id="pilihan?.id ?? null" :subtitle="pilihan ? `${pilihan.mataKuliah} · Kelas ${pilihan.kelasNama}` : ''" />
  </div>
</template>
