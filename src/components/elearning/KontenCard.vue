<script setup lang="ts">
import { computed } from 'vue';
import { sampulKonten, type JenisKonten, type KontenRingkas } from '@/api/elearning';

/**
 * Kartu konten e-learning bergaya katalog kursus: thumbnail (thumbnail YouTube untuk video, gradien + ikon untuk
 * materi / kuis), judul, mata kuliah, badge jenis & pertemuan, statistik penerima / kuis, dan tombol aksi.
 */
/** prasyaratJudul: judul konten prasyarat (bila ada) untuk penanda di kartu. */
const props = defineProps<{ konten: KontenRingkas; mataKuliah?: string; prasyaratJudul?: string | null }>();
// hasil: kuis → hasil pengerjaan, tugas → pengumpulan.
defineEmits<{ buka: []; ubah: []; hasil: [] }>();

// Status periode tayang (relatif waktu sekarang).
const sekarang = Date.now();
const belumTayang = computed(() => !!props.konten.tersediaMulai && new Date(props.konten.tersediaMulai).getTime() > sekarang);
const sudahBerakhir = computed(() => !!props.konten.tersediaSampai && new Date(props.konten.tersediaSampai).getTime() < sekarang);
const tglPendek = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

const GAYA: Record<JenisKonten, { label: string; icon: string; badge: string; latar: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', badge: 'bg-[#2563eb] text-white', latar: 'from-[#1e40af] via-[#2563eb] to-[#60a5fa]' },
  VIDEO: { label: 'Video', icon: 'smart_display', badge: 'bg-[#d83b3b] text-white', latar: 'from-[#7f1d1d] via-[#d83b3b] to-[#f59e0b]' },
  KUIS: { label: 'Kuis', icon: 'quiz', badge: 'bg-[#7c3aed] text-white', latar: 'from-[#4c1d95] via-[#7c3aed] to-[#c084fc]' },
  TUGAS: { label: 'Tugas', icon: 'assignment', badge: 'bg-[#0891b2] text-white', latar: 'from-[#164e63] via-[#0891b2] to-[#67e8f9]' },
};
const gaya = computed(() => GAYA[props.konten.jenis]);
const thumb = computed(() => sampulKonten(props.konten));
const angka = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
</script>

<template>
  <article
    class="group w-64 shrink-0 snap-start rounded-xl border border-outline-variant bg-surface-container-lowest p-3 flex flex-col hover:shadow-md hover:border-primary/60 transition cursor-pointer"
    role="button"
    tabindex="0"
    @click="$emit('buka')"
    @keydown.enter="$emit('buka')"
  >
    <!-- Thumbnail -->
    <div class="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br" :class="gaya.latar">
      <img v-if="thumb" :src="thumb" :alt="konten.judul" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div v-else class="absolute inset-0 flex items-center justify-center">
        <span class="material-symbols-outlined text-white/90 drop-shadow" style="font-size: 56px">{{ gaya.icon }}</span>
      </div>
      <span v-if="konten.jenis === 'VIDEO' && thumb" class="absolute inset-0 flex items-center justify-center">
        <span class="material-symbols-outlined text-white bg-black/50 rounded-full p-2 group-hover:scale-110 transition" style="font-size: 32px">play_arrow</span>
      </span>
      <span class="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-label-sm font-semibold shadow" :class="gaya.badge">
        <span class="material-symbols-outlined" style="font-size: 14px">{{ gaya.icon }}</span>
        {{ gaya.label }}
      </span>
      <span v-if="!konten.isPublished" class="absolute top-2 right-2 px-2 py-0.5 rounded-md text-label-sm font-semibold bg-[#eda100] text-white shadow">Draf</span>
    </div>

    <!-- Isi -->
    <h3 class="mt-3 font-semibold text-on-surface leading-snug line-clamp-2 min-h-[2.75rem] group-hover:text-primary">{{ konten.judul }}</h3>
    <!-- Penerbit: nama dosen | mata kuliah -->
    <p class="mt-1 text-label-sm text-on-surface-variant line-clamp-1" :title="[konten.namaDosen, mataKuliah].filter(Boolean).join(' | ')">
      {{ [konten.namaDosen, mataKuliah ?? konten.deskripsi].filter(Boolean).join(' | ') }}
    </p>

    <!-- Tagline · kategori · rating (kuis) -->
    <div class="mt-3 flex flex-wrap gap-1.5 text-label-sm">
      <span v-if="konten.isWajib" class="px-2 py-0.5 rounded text-label-sm bg-[#d83b3b] text-white font-semibold inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">priority_high</span>Wajib</span>
      <span v-for="t in konten.tagline" :key="t" class="px-2 py-0.5 rounded bg-[#d1f0ec] text-[#0f5f56] font-semibold">{{ t }}</span>
      <!-- Periode tayang & cakupan kampus -->
      <span v-if="belumTayang" class="px-2 py-0.5 rounded bg-[#eda100]/20 text-[#7a5200] font-medium" :title="'Tayang mulai ' + konten.tersediaMulai">Tayang {{ tglPendek(konten.tersediaMulai!) }}</span>
      <span v-else-if="sudahBerakhir" class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">Periode berakhir</span>
      <span v-else-if="konten.tersediaSampai" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">s.d. {{ tglPendek(konten.tersediaSampai) }}</span>
      <span v-if="konten.target === 'KAMPUS'" class="px-2 py-0.5 rounded bg-[#0284c7]/12 text-[#075985] font-medium inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">public</span>Kampus</span>
      <span v-if="konten.target === 'GRUP'" class="px-2 py-0.5 rounded bg-[#7c3aed]/12 text-[#5b21b6] font-medium inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">groups</span>Grup</span>
      <span v-if="konten.kategori" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">{{ konten.kategori }}</span>
      <span v-if="konten.jenis === 'KUIS' && konten.rataSkor !== null" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant inline-flex items-center gap-0.5" title="Rata-rata skor kuis">
        <span class="material-symbols-outlined text-[#b4690e]" style="font-size: 13px">star</span>{{ angka(konten.rataSkor) }}
      </span>
      <span v-if="konten.pertemuanKe" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">Pertemuan {{ konten.pertemuanKe }}</span>
      <span v-if="konten.adaLampiran" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant inline-flex items-center gap-0.5">
        <span class="material-symbols-outlined" style="font-size: 13px">attach_file</span>Lampiran
      </span>
      <span v-if="konten.jenis === 'KUIS'" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">{{ konten.jumlahSoal }} soal</span>
    </div>
    <p v-if="prasyaratJudul" class="mt-2 text-label-sm text-on-surface-variant inline-flex items-start gap-1" :title="'Prasyarat: ' + prasyaratJudul">
      <span class="material-symbols-outlined text-[#b4690e]" style="font-size: 14px">lock</span>
      <span class="line-clamp-1">Setelah: {{ prasyaratJudul }}</span>
    </p>
    <!-- Jumlah mahasiswa (seperti "21.156 peringkat") -->
    <div class="mt-1.5 flex flex-wrap gap-1.5">
      <span
        class="px-2 py-0.5 rounded border border-outline-variant text-label-sm text-on-surface-variant inline-flex items-center gap-1"
        :title="`Dibuka ${konten.dilihat.total.toLocaleString('id-ID')} kali oleh ${konten.dilihat.mahasiswa.toLocaleString('id-ID')} mahasiswa`"
      >
        <span class="material-symbols-outlined" style="font-size: 14px">visibility</span>{{ konten.dilihat.total.toLocaleString('id-ID') }}× dilihat
      </span>
      <span class="px-2 py-0.5 rounded border border-outline-variant text-label-sm text-on-surface-variant">
        <template v-if="konten.jenis === 'TUGAS'">{{ konten.sudahMengerjakan.toLocaleString('id-ID') }}/{{ konten.jumlahPenerima.toLocaleString('id-ID') }} mengumpulkan</template>
        <template v-else-if="konten.jenis === 'KUIS'">{{ konten.sudahMengerjakan.toLocaleString('id-ID') }}/{{ konten.jumlahPenerima.toLocaleString('id-ID') }} mengerjakan</template>
        <template v-else>{{ konten.jumlahPenerima.toLocaleString('id-ID') }} mahasiswa{{ konten.target === 'PILIHAN' ? ' terpilih' : konten.target === 'GRUP' ? ' dalam grup' : '' }}</template>
      </span>
    </div>

    <div class="mt-auto pt-3 flex items-center justify-end gap-2">
      <button
        v-if="konten.jenis === 'KUIS' || konten.jenis === 'TUGAS'"
        type="button"
        class="px-3 py-1.5 rounded-md text-primary text-label-md font-semibold hover:bg-primary-container"
        @click.stop="$emit('hasil')"
      >
        {{ konten.jenis === 'KUIS' ? 'Hasil' : 'Pengumpulan' }}
      </button>
      <button
        type="button"
        class="px-3 py-1.5 rounded-md border border-primary text-primary text-label-md font-semibold hover:bg-primary-container"
        @click.stop="$emit('ubah')"
      >
        Ubah
      </button>
    </div>
  </article>
</template>
