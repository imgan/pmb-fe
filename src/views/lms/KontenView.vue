<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import LmsFilterBar from '@/components/lms/LmsFilterBar.vue';
import ProgresBar from '@/components/lms/ProgresBar.vue';
import KontenDetailModal from '@/components/lms/KontenDetailModal.vue';
import BankUjianPanel from '@/components/lms/BankUjianPanel.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { useLmsData } from '@/composables/useLmsFilter';
import { usePaginasi } from '@/composables/usePaginasi';
import { usePermission } from '@/composables/usePermission';
import { lmsConsoleApi, type LmsKonten } from '@/api/lmsConsole';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { formatDateTime } from '@/utils/format';
import { JENIS_KONTEN, TARGET_KONTEN, teksAngka } from '@/utils/lmsKonten';

/**
 * LMS → Materi Pembelajaran / Tugas / Kuis & Ujian (route meta.sumber): konten e-learning yang diunggah dosen di
 * seluruh kelas tahun akademik terpilih + statistik penerima, dan pengaturan terbit/draf oleh admin. Kuis & Ujian juga
 * punya tab Bank Ujian: paket soal PG + essay buatan admin (dipakai tes seleksi PMB).
 */
const route = useRoute();
const sumber = route.meta.sumber as 'materi' | 'tugas' | 'kuis';
const { canUpdate } = usePermission(route.meta.menuCode as string);

const JUDUL = {
  materi: { title: 'Materi Pembelajaran', sub: 'LMS / Materi Pembelajaran — materi & video dari dosen.', selesai: 'Selesai dipelajari', rata: '' },
  tugas: { title: 'Tugas', sub: 'LMS / Tugas — pengumpulan & penilaian tugas mahasiswa.', selesai: 'Dikumpulkan', rata: 'Rata nilai' },
  kuis: { title: 'Kuis & Ujian', sub: 'LMS / Kuis & Ujian — pengerjaan & skor kuis daring.', selesai: 'Dikerjakan', rata: 'Rata skor' },
}[sumber];

// Kuis & Ujian: tab kuis dari dosen per kelas / bank ujian buatan admin.
const tab = ref<'kelas' | 'bank'>('kelas');

const search = ref('');
const status = ref<'' | 'TERBIT' | 'DRAF'>('');
const jenis = ref<'' | 'MATERI' | 'VIDEO'>('');
const { data, loading, error, muat } = useLmsData<LmsKonten[]>(
  (f) => lmsConsoleApi.konten(sumber, f),
  () => ({ search: search.value, status: status.value, jenis: jenis.value }),
  'Gagal memuat konten',
);
const rows = computed(() => data.value ?? []);
const { page, limit, meta, halaman } = usePaginasi(rows);

const ringkasan = computed(() => {
  const r = rows.value;
  const total = (f: (k: LmsKonten) => number) => r.reduce((s, k) => s + f(k), 0);
  const nilai = r.filter((k) => k.rata != null);
  const nRata = total((k) => (k.rata != null ? k.selesai : 0));
  const base = [
    { label: 'Total', nilai: `${r.length}`, sub: `${r.filter((k) => !k.isPublished).length} draf` },
    { label: JUDUL.selesai, nilai: `${total((k) => k.selesai)}`, sub: `dari ${total((k) => k.penerima)} penerima` },
  ];
  if (sumber === 'materi') {
    return [
      ...base,
      { label: 'Dilihat', nilai: `${total((k) => k.dilihat)}×`, sub: `${total((k) => k.melihat)} mahasiswa membuka` },
      {
        label: 'Materi · Video',
        nilai: `${r.filter((k) => k.jenis === 'MATERI').length} · ${r.filter((k) => k.jenis === 'VIDEO').length}`,
        sub: `${total((k) => k.komentar)} komentar`,
      },
    ];
  }
  return [
    ...base,
    {
      label: JUDUL.rata,
      nilai: nRata ? teksAngka(total((k) => (k.rata ?? 0) * (k.rata != null ? k.selesai : 0)) / nRata) : '–',
      sub: `${nilai.length} ${sumber} bernilai`,
    },
    sumber === 'tugas'
      ? {
          label: 'Belum dinilai',
          nilai: `${total((k) => k.belumDinilai)}`,
          sub: `${total((k) => k.terlambat)} dikumpulkan terlambat`,
          peringatan: total((k) => k.belumDinilai) > 0,
        }
      : { label: 'Jumlah soal', nilai: `${total((k) => k.soal)}`, sub: `${r.filter((k) => k.lewatTenggat).length} sudah lewat tenggat` },
  ];
});

const detailOpen = ref(false);
const detailId = ref<number | null>(null);
const buka = (k: LmsKonten) => {
  detailId.value = k.id;
  detailOpen.value = true;
};
const ubahTerbit = async (k: LmsKonten) => {
  const jadi = !k.isPublished;
  const ok = await confirmAction({
    title: jadi ? 'Terbitkan konten?' : 'Sembunyikan konten?',
    text: jadi ? `"${k.judul}" akan tampil lagi untuk mahasiswa.` : `"${k.judul}" tidak akan tampil untuk mahasiswa sampai diterbitkan kembali.`,
    confirmLabel: jadi ? 'Terbitkan' : 'Sembunyikan',
    danger: !jadi,
  });
  if (!ok) return;
  try {
    await lmsConsoleApi.setTerbit(k.id, jadi);
    toastSuccess(jadi ? 'Konten diterbitkan' : 'Konten disembunyikan');
    muat();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengubah status konten'));
  }
};
</script>

<template>
  <div>
    <PageHeader :title="JUDUL.title" :subtitle="JUDUL.sub" />
    <div v-if="sumber === 'kuis'" class="flex gap-1 mb-4 border-b border-outline-variant">
      <button
        v-for="t in [
          { key: 'kelas', label: 'Kuis Kelas', icon: 'school' },
          { key: 'bank', label: 'Bank Ujian (PMB & Ujian)', icon: 'quiz' },
        ] as const"
        :key="t.key"
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 text-label-md transition-colors"
        :class="tab === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'"
        @click="tab = t.key"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">{{ t.icon }}</span>
        {{ t.label }}
      </button>
    </div>

    <BankUjianPanel v-if="sumber === 'kuis' && tab === 'bank'" />
    <template v-else>
      <LmsFilterBar v-model:search="search" placeholder="Cari judul, mata kuliah, dosen...">
        <div v-if="sumber === 'materi'" class="flex rounded-lg border border-outline-variant overflow-hidden text-label-md h-10">
          <button
            v-for="s in [
              { key: '', label: 'Semua jenis' },
              { key: 'MATERI', label: 'Materi' },
              { key: 'VIDEO', label: 'Video' },
            ] as const"
            :key="s.key"
            type="button"
            class="px-3 transition-colors"
            :class="jenis === s.key ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container'"
            @click="jenis = s.key"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="flex rounded-lg border border-outline-variant overflow-hidden text-label-md h-10">
          <button
            v-for="s in [
              { key: '', label: 'Semua status' },
              { key: 'TERBIT', label: 'Terbit' },
              { key: 'DRAF', label: 'Draf' },
            ] as const"
            :key="s.key"
            type="button"
            class="px-3 transition-colors"
            :class="status === s.key ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container'"
            @click="status = s.key"
          >
            {{ s.label }}
          </button>
        </div>
      </LmsFilterBar>

      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <div v-for="c in ringkasan" :key="c.label" class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p class="text-label-md text-on-surface-variant">{{ c.label }}</p>
          <p class="mt-1 text-headline-md font-bold tabular-nums" :class="'peringatan' in c && c.peringatan ? 'text-[#b45309]' : 'text-on-surface'">
            {{ c.nilai }}
          </p>
          <p class="text-label-sm text-on-surface-variant">{{ c.sub }}</p>
        </div>
      </div>

      <PageSizeSelect v-model="limit" class="mb-3" />
      <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden" :class="{ 'opacity-60': loading }">
        <div class="overflow-x-auto">
          <table class="w-full text-body-sm">
            <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
              <tr>
                <th class="text-left font-semibold px-4 py-3">{{ sumber === 'materi' ? 'Materi / Video' : sumber === 'tugas' ? 'Tugas' : 'Kuis' }}</th>
                <th class="text-left font-semibold px-3 py-3">Kelas</th>
                <th v-if="sumber !== 'materi'" class="text-left font-semibold px-3 py-3">Tenggat</th>
                <th v-if="sumber === 'materi'" class="text-center font-semibold px-2 py-3">Dilihat</th>
                <th v-if="sumber === 'kuis'" class="text-center font-semibold px-2 py-3">Soal</th>
                <th class="text-left font-semibold px-3 py-3">{{ JUDUL.selesai }}</th>
                <th v-if="sumber !== 'materi'" class="text-center font-semibold px-2 py-3">{{ JUDUL.rata }}</th>
                <th v-if="sumber === 'tugas'" class="text-center font-semibold px-2 py-3">Belum dinilai</th>
                <th class="text-center font-semibold px-2 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!loading && !rows.length"><td colspan="8" class="px-4 py-10 text-center text-on-surface-variant">Belum ada konten.</td></tr>
              <tr v-for="k in halaman" :key="k.id" class="border-t border-outline-variant hover:bg-surface-container-low">
                <td class="px-4 py-3">
                  <button type="button" class="flex items-center gap-3 text-left group" @click="buka(k)">
                    <span class="material-symbols-outlined rounded-md p-1.5" :class="JENIS_KONTEN[k.jenis].kelas" style="font-size: 18px">
                      {{ JENIS_KONTEN[k.jenis].icon }}
                    </span>
                    <span class="min-w-0">
                      <span class="block font-semibold text-on-surface group-hover:text-primary">
                        {{ k.judul }}
                        <span v-if="k.isWajib" class="ml-1.5 rounded px-1.5 py-0.5 text-[11px] bg-[#d83b3b]/10 text-[#a32020] font-semibold">Wajib</span>
                      </span>
                      <span class="block text-label-sm text-on-surface-variant">
                        {{ k.namaDosen ?? '-' }} · {{ formatDateTime(k.createdAt) }} · {{ TARGET_KONTEN[k.target] }}
                      </span>
                    </span>
                  </button>
                </td>
                <td class="px-3 py-3">
                  <RouterLink v-if="k.kelas" :to="{ name: 'lms-kelas-detail', params: { id: k.kelas.id } }" class="hover:text-primary">
                    <span class="block font-medium">{{ k.kelas.namaMataKuliah }}</span>
                    <span class="block text-label-sm text-on-surface-variant">{{ k.kelas.kodeMataKuliah }} · Kelas {{ k.kelas.kelas }}</span>
                  </RouterLink>
                </td>
                <td v-if="sumber !== 'materi'" class="px-3 py-3 whitespace-nowrap">
                  <template v-if="k.tenggat">
                    {{ formatDateTime(k.tenggat) }}
                    <span class="block text-[11px] font-semibold" :class="k.lewatTenggat ? 'text-on-surface-variant' : 'text-[#047857]'">
                      {{ k.lewatTenggat ? 'Sudah lewat' : 'Berjalan' }}
                    </span>
                  </template>
                  <span v-else class="text-on-surface-variant">–</span>
                </td>
                <td v-if="sumber === 'materi'" class="px-2 py-3 text-center tabular-nums">
                  {{ k.melihat }}
                  <span class="text-label-sm text-on-surface-variant">({{ k.dilihat }}×)</span>
                </td>
                <td v-if="sumber === 'kuis'" class="px-2 py-3 text-center tabular-nums">{{ k.soal }}</td>
                <td class="px-3 py-3">
                  <ProgresBar
                    :nilai="k.penyelesaian"
                    :keterangan="`${k.selesai}/${k.penerima}${sumber === 'tugas' && k.terlambat ? ` · ${k.terlambat} terlambat` : ''}`"
                  />
                </td>
                <td v-if="sumber !== 'materi'" class="px-2 py-3 text-center font-semibold tabular-nums">{{ teksAngka(k.rata) }}</td>
                <td
                  v-if="sumber === 'tugas'"
                  class="px-2 py-3 text-center tabular-nums"
                  :class="k.belumDinilai ? 'text-[#b45309] font-semibold' : 'text-on-surface-variant'"
                >
                  {{ k.belumDinilai }}
                </td>
                <td class="px-2 py-3 text-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold transition-colors"
                    :class="[
                      k.isPublished ? 'bg-success-container text-on-success-container' : 'bg-surface-container text-on-surface-variant',
                      canUpdate ? 'hover:opacity-80' : 'cursor-default',
                    ]"
                    :title="canUpdate ? (k.isPublished ? 'Klik untuk menyembunyikan' : 'Klik untuk menerbitkan') : ''"
                    :disabled="!canUpdate"
                    @click="ubahTerbit(k)"
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px">{{ k.isPublished ? 'visibility' : 'visibility_off' }}</span>
                    {{ k.isPublished ? 'Terbit' : 'Draf' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination v-model="page" :meta="meta" />
      </div>

    </template>

    <KontenDetailModal v-model="detailOpen" :konten-id="detailId" />
  </div>
</template>
