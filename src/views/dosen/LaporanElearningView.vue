<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import Modal from '@/components/ui/Modal.vue';
import { dosenElearningApi, formatDurasi, type ElearningKelas, type LaporanElearning } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';

/**
 * Portal Dosen → Laporan → Laporan E-learning (per kelas yang diampu):
 * - Nilai Kuis: mahasiswa × kuis (skor / belum mengerjakan) + rata-rata;
 * - Video & Materi: jumlah mahasiswa yang melihat, total dilihat, yang menandai selesai — klik untuk rincian per mahasiswa.
 */
const route = useRoute();
const router = useRouter();
const kelasList = ref<ElearningKelas[]>([]);
const kelasId = ref<number | ''>(Number(route.query.kelas) || '');
const data = ref<LaporanElearning | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const tab = ref<'kuis' | 'video'>(route.query.tab === 'video' ? 'video' : 'kuis');

onMounted(async () => {
  try {
    kelasList.value = await dosenElearningApi.kelas();
    if (!kelasId.value && kelasList.value.length) kelasId.value = kelasList.value[0].id;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  }
});
watch(kelasId, async (id) => {
  router.replace({ query: { ...route.query, kelas: id ? String(id) : undefined } });
  data.value = null;
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    data.value = await dosenElearningApi.laporan(id);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat laporan');
  } finally {
    loading.value = false;
  }
});
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }));

const angka = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
const ringkas = computed(() => {
  const d = data.value;
  if (!d) return null;
  const totalTugas = d.kuis.reduce((s, k) => s + k.penerima, 0);
  const totalKerja = d.kuis.reduce((s, k) => s + k.mengerjakan, 0);
  const skor = d.nilai.map((n) => n.rata).filter((v): v is number => v !== null);
  return {
    kuis: d.kuis.length,
    pengerjaan: totalTugas ? Math.round((totalKerja / totalTugas) * 100) : 0,
    rata: skor.length ? skor.reduce((s, v) => s + v, 0) / skor.length : null,
    konten: d.konten.length,
    melihat: d.konten.reduce((s, k) => s + k.mahasiswaMelihat, 0),
    penerimaKonten: d.konten.reduce((s, k) => s + k.penerima, 0),
  };
});

// Rincian per konten (siapa saja yang melihat).
const rincianOpen = ref(false);
const rincian = ref<LaporanElearning['konten'][number] | null>(null);
const bukaRincian = (k: LaporanElearning['konten'][number]) => {
  rincian.value = k;
  rincianOpen.value = true;
};
const persen = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const th = 'px-3 py-2.5 border border-white/25 font-semibold';
const td = 'px-3 py-2 border border-outline-variant';
</script>

<template>
  <div>
    <PageHeader title="Laporan E-learning" subtitle="Skor kuis per mahasiswa dan jumlah mahasiswa yang melihat video / materi di kelas Anda." />

    <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg p-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
      <label class="flex-1 md:max-w-xl">
        <span class="sr-only">Kelas</span>
        <select v-model="kelasId" class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm">
          <option value="" disabled>-- Pilih kelas --</option>
          <option v-for="k in kelasList" :key="k.id" :value="k.id">{{ k.kodeMataKuliah }} — {{ k.namaMataKuliah }} · Kelas {{ k.kelas }}</option>
        </select>
      </label>
      <div class="md:ml-auto inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md self-start">
        <button
          v-for="t in [
            { key: 'kuis', label: 'Nilai Kuis', icon: 'quiz' },
            { key: 'video', label: 'Video & Materi Dilihat', icon: 'visibility' },
          ] as const"
          :key="t.key"
          type="button"
          class="px-3 py-1.5 border-l border-outline-variant first:border-l-0 inline-flex items-center gap-1.5 transition-colors"
          :class="tab === t.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
          @click="tab = t.key"
        >
          <span class="material-symbols-outlined" style="font-size: 17px">{{ t.icon }}</span>{{ t.label }}
        </button>
      </div>
    </section>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="!kelasList.length && !error" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
      Anda belum mengampu kelas pada tahun akademik ini.
    </div>
    <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat laporan...</div>

    <template v-else-if="data && ringkas">
      <!-- Ringkasan -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
          <p class="text-label-sm text-on-surface-variant">Peserta kelas</p>
          <p class="text-headline-sm font-semibold">{{ data.peserta }}</p>
        </div>
        <template v-if="tab === 'kuis'">
          <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Jumlah kuis</p>
            <p class="text-headline-sm font-semibold">{{ ringkas.kuis }}</p>
          </div>
          <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Tingkat pengerjaan</p>
            <p class="text-headline-sm font-semibold">{{ ringkas.pengerjaan }}%</p>
          </div>
          <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Rata-rata skor</p>
            <p class="text-headline-sm font-semibold">{{ angka(ringkas.rata) }}</p>
          </div>
        </template>
        <template v-else>
          <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Video & materi</p>
            <p class="text-headline-sm font-semibold">{{ ringkas.konten }}</p>
          </div>
          <div class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 col-span-2">
            <p class="text-label-sm text-on-surface-variant">Cakupan dilihat (mahasiswa melihat ÷ penerima, semua konten)</p>
            <p class="text-headline-sm font-semibold">{{ persen(ringkas.melihat, ringkas.penerimaKonten) }}%</p>
          </div>
        </template>
      </div>

      <!-- Nilai kuis -->
      <section v-if="tab === 'kuis'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div v-if="!data.kuis.length" class="p-8 text-center text-body-sm text-on-surface-variant">Belum ada kuis terbit di kelas ini.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-body-sm border-collapse">
            <thead class="bg-primary text-on-primary">
              <tr>
                <th rowspan="2" :class="th" class="w-12 text-center">No</th>
                <th rowspan="2" :class="th" class="text-left">NIM</th>
                <th rowspan="2" :class="th" class="text-left min-w-[12rem]">Nama Mahasiswa</th>
                <th :colspan="data.kuis.length" :class="th" class="text-center">Skor Kuis</th>
                <th rowspan="2" :class="th" class="text-center">Dikerjakan</th>
                <th rowspan="2" :class="th" class="text-center">Rata-rata</th>
              </tr>
              <tr>
                <th v-for="k in data.kuis" :key="k.id" :class="th" class="text-center min-w-[7rem] font-medium" :title="k.judul">
                  <span class="line-clamp-2">{{ k.judul }}</span>
                  <span v-if="k.isWajib" class="block text-label-sm opacity-80">Wajib</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(n, i) in data.nilai" :key="n.id">
                <td :class="td" class="text-center">{{ i + 1 }}</td>
                <td :class="td" class="whitespace-nowrap">{{ n.nim }}</td>
                <td :class="td">{{ n.nama }}</td>
                <td v-for="k in data.kuis" :key="k.id" :class="td" class="text-center tabular-nums">
                  <span v-if="!(String(k.id) in n.skor)" class="text-on-surface-variant/60" title="Bukan penerima kuis ini">—</span>
                  <span v-else-if="n.skor[k.id] === null" class="text-label-sm italic text-[#b4690e]">belum</span>
                  <span v-else class="font-semibold">{{ angka(n.skor[k.id]) }}</span>
                </td>
                <td :class="td" class="text-center tabular-nums">{{ n.dikerjakan }}/{{ n.ditugaskan }}</td>
                <td :class="td" class="text-center tabular-nums font-semibold">{{ angka(n.rata) }}</td>
              </tr>
            </tbody>
            <tfoot class="bg-surface-container-low font-medium">
              <tr>
                <td :class="td" colspan="3" class="text-right">Mengerjakan</td>
                <td v-for="k in data.kuis" :key="k.id" :class="td" class="text-center tabular-nums">{{ k.mengerjakan }}/{{ k.penerima }}</td>
                <td :class="td" colspan="2" />
              </tr>
              <tr>
                <td :class="td" colspan="3" class="text-right">Rata-rata skor</td>
                <td v-for="k in data.kuis" :key="k.id" :class="td" class="text-center tabular-nums">{{ angka(k.rata) }}</td>
                <td :class="td" colspan="2" />
              </tr>
            </tfoot>
          </table>
          <p class="px-4 py-2 text-label-sm text-on-surface-variant">"belum" = penerima yang belum mengerjakan · "—" = bukan penerima kuis tersebut.</p>
        </div>
      </section>

      <!-- Video & materi -->
      <section v-else class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div v-if="!data.konten.length" class="p-8 text-center text-body-sm text-on-surface-variant">Belum ada video atau materi terbit di kelas ini.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-body-sm border-collapse">
            <thead class="bg-primary text-on-primary">
              <tr>
                <th :class="th" class="w-12 text-center">No</th>
                <th :class="th" class="text-left min-w-[16rem]">Konten</th>
                <th :class="th" class="text-center">Penerima</th>
                <th :class="th" class="text-left min-w-[14rem]">Mahasiswa melihat</th>
                <th :class="th" class="text-center">Total dilihat</th>
                <th :class="th" class="text-center">Tandai selesai</th>
                <th :class="th" class="text-center">Rincian</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(k, i) in data.konten" :key="k.id" class="align-top">
                <td :class="td" class="text-center">{{ i + 1 }}</td>
                <td :class="td">
                  <span class="inline-flex items-center gap-1 font-medium">
                    <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 17px">{{ k.jenis === 'VIDEO' ? 'smart_display' : 'library_books' }}</span>
                    {{ k.judul }}
                  </span>
                  <span class="block text-label-sm text-on-surface-variant">
                    {{ k.jenis === 'VIDEO' ? 'Video' : 'Materi' }}{{ k.pertemuanKe ? ` · Pertemuan ${k.pertemuanKe}` : '' }}{{ k.isWajib ? ' · Wajib' : '' }}
                  </span>
                </td>
                <td :class="td" class="text-center tabular-nums">{{ k.penerima }}</td>
                <td :class="td">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                      <div class="h-full rounded-full bg-primary" :style="{ width: `${persen(k.mahasiswaMelihat, k.penerima)}%` }" />
                    </div>
                    <span class="whitespace-nowrap tabular-nums font-semibold">{{ k.mahasiswaMelihat }}/{{ k.penerima }}</span>
                    <span class="text-label-sm text-on-surface-variant w-10 text-right">{{ persen(k.mahasiswaMelihat, k.penerima) }}%</span>
                  </div>
                </td>
                <td :class="td" class="text-center tabular-nums">{{ k.totalDilihat }}×</td>
                <td :class="td" class="text-center tabular-nums">{{ k.mahasiswaSelesai }}/{{ k.penerima }}</td>
                <td :class="td" class="text-center">
                  <button type="button" class="text-primary text-label-md hover:underline" @click="bukaRincian(k)">Lihat</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <Modal v-model="rincianOpen" :title="rincian ? `Yang melihat — ${rincian.judul}` : 'Rincian'" :subtitle="rincian ? `${rincian.mahasiswaMelihat} dari ${rincian.penerima} mahasiswa sudah melihat` : ''" size="xl">
      <div v-if="rincian" class="overflow-x-auto border border-outline-variant rounded-lg">
        <table class="w-full text-body-sm border-collapse">
          <thead class="bg-primary text-on-primary">
            <tr>
              <th class="p-2.5 text-left w-10">No</th>
              <th class="p-2.5 text-left">NIM</th>
              <th class="p-2.5 text-left">Nama</th>
              <th class="p-2.5 text-center">Dilihat</th>
              <th class="p-2.5 text-center">Durasi</th>
              <th class="p-2.5 text-left">Terakhir dilihat</th>
              <th class="p-2.5 text-center">Selesai</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="(r, i) in [...rincian.rows].sort((a, b) => b.dilihat - a.dilihat)" :key="r.id">
              <td class="p-2.5">{{ i + 1 }}</td>
              <td class="p-2.5 whitespace-nowrap">{{ r.nim }}</td>
              <td class="p-2.5">{{ r.nama }}</td>
              <td class="p-2.5 text-center tabular-nums">
                <span v-if="r.dilihat" class="font-semibold">{{ r.dilihat }}×</span>
                <span v-else class="text-label-sm italic text-[#b4690e]">belum melihat</span>
              </td>
              <td class="p-2.5 text-center tabular-nums whitespace-nowrap">{{ formatDurasi(r.durasi) }}</td>
              <td class="p-2.5">{{ r.terakhirDilihat ? formatDateTime(r.terakhirDilihat) : '-' }}</td>
              <td class="p-2.5 text-center">
                <span v-if="r.selesai" class="material-symbols-outlined text-[#05603a]" style="font-size: 18px" :title="formatDateTime(r.selesai)">check_circle</span>
                <span v-else class="text-on-surface-variant">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  </div>
</template>
