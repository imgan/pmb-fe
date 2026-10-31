<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import { mahasiswaElearningApi, type ItemRiwayat, type JenisKonten, type RiwayatBelajar } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { formatDateTime } from '@/utils/format';

/**
 * Portal Mahasiswa → E-learning → Learning History: apa yang sudah dipelajari pada semester lampau — konten
 * kelas KRS disetujui per periode → mata kuliah, dengan status (Selesai / Dibuka / Belum), skor kuis, nilai
 * tugas & tanggal. Opsi "Termasuk semester ini" menampilkan juga semester berjalan.
 */
const data = ref<RiwayatBelajar | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const semuaPeriode = ref(false);
const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await mahasiswaElearningApi.riwayat(semuaPeriode.value);
    periodeId.value = '';
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat riwayat belajar');
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(semuaPeriode, load);

const periodeId = ref<number | ''>('');
const search = ref('');
const statusFilter = ref<'' | ItemRiwayat['status']>('');
const tampil = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (data.value?.periode ?? [])
    .filter((p) => !periodeId.value || p.id === periodeId.value)
    .map((p) => ({
      ...p,
      kelas: p.kelas
        .map((k) => ({
          ...k,
          konten: k.konten.filter(
            (c) =>
              (!statusFilter.value || c.status === statusFilter.value) &&
              (!q || [c.judul, k.namaMataKuliah, k.kodeMataKuliah].some((v) => v.toLowerCase().includes(q))),
          ),
        }))
        .filter((k) => k.konten.length),
    }))
    .filter((p) => p.kelas.length);
});

// Kartu mata kuliah bisa dibuka-tutup (default terbuka).
const tertutup = reactive(new Set<string>());
const kunci = (pid: number, kid: number) => `${pid}-${kid}`;
const toggle = (k: string) => (tertutup.has(k) ? tertutup.delete(k) : tertutup.add(k));

const JENIS: Record<JenisKonten, { label: string; icon: string; cls: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', cls: 'bg-[#2563eb]/10 text-[#1e40af]' },
  VIDEO: { label: 'Video', icon: 'smart_display', cls: 'bg-[#db2777]/10 text-[#9d174d]' },
  KUIS: { label: 'Kuis', icon: 'quiz', cls: 'bg-[#16a34a]/10 text-[#166534]' },
  TUGAS: { label: 'Tugas', icon: 'assignment', cls: 'bg-[#0891b2]/10 text-[#0e7490]' },
};
const STATUS: Record<ItemRiwayat['status'], { label: string; icon: string; cls: string }> = {
  SELESAI: { label: 'Selesai', icon: 'check_circle', cls: 'bg-[#059669]/15 text-[#05603a]' },
  DIBUKA: { label: 'Dibuka', icon: 'visibility', cls: 'bg-[#eda100]/20 text-[#7a5200]' },
  BELUM: { label: 'Belum', icon: 'radio_button_unchecked', cls: 'bg-surface-container text-on-surface-variant' },
};
const persen = (r: { jumlah: number; selesai: number }) => (r.jumlah ? Math.round((r.selesai / r.jumlah) * 100) : 0);
const angka = (v: number | null) => (v === null ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
const kartu = computed(() => {
  const r = data.value?.ringkasan;
  return [
    { label: 'Konten Dipelajari', nilai: `${r?.selesai ?? 0}/${r?.jumlah ?? 0}`, icon: 'task_alt' },
    { label: 'Penyelesaian', nilai: `${r ? persen(r) : 0}%`, icon: 'percent' },
    { label: 'Rata-rata Kuis', nilai: angka(r?.rataKuis ?? null), icon: 'quiz' },
    { label: 'Rata-rata Tugas', nilai: angka(r?.rataTugas ?? null), icon: 'assignment_turned_in' },
  ];
});
const keterangan = (c: ItemRiwayat) => {
  if (c.jenis === 'KUIS' && c.skor !== null) return `Skor ${angka(c.skor)}`;
  if (c.jenis === 'TUGAS' && c.selesaiPada) return c.nilaiTugas !== null ? `Nilai ${angka(c.nilaiTugas)}${c.terlambat ? ' · terlambat' : ''}` : `Belum dinilai${c.terlambat ? ' · terlambat' : ''}`;
  if (c.dilihat) return `${c.dilihat}× dibuka`;
  return '';
};
</script>

<template>
  <div>
    <PageHeader title="Learning History" subtitle="Apa yang sudah Anda pelajari di e-learning pada semester-semester sebelumnya." />
    <ElearningShell portal="mahasiswa">
      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

      <!-- Ringkasan -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div v-for="k in kartu" :key="k.label" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex items-center gap-3">
          <span class="material-symbols-outlined text-primary bg-primary-container/60 rounded-full p-2" style="font-size: 20px">{{ k.icon }}</span>
          <div>
            <p class="text-label-sm text-on-surface-variant">{{ k.label }}</p>
            <p class="text-headline-sm font-semibold text-on-surface">{{ k.nilai }}</p>
          </div>
        </div>
      </div>

      <!-- Filter -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 mb-4 flex flex-col lg:flex-row lg:items-center gap-3 text-body-sm">
        <select v-model="periodeId" class="w-full lg:w-56 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest">
          <option value="">Semua periode</option>
          <option v-for="p in data?.periode ?? []" :key="p.id" :value="p.id">{{ p.nama }}{{ p.aktif ? ' (berjalan)' : '' }}</option>
        </select>
        <div class="inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md self-start">
          <button
            v-for="f in [
              { key: '', label: 'Semua' },
              { key: 'SELESAI', label: 'Selesai' },
              { key: 'DIBUKA', label: 'Dibuka' },
              { key: 'BELUM', label: 'Belum' },
            ] as const"
            :key="f.key"
            type="button"
            class="px-3 py-1.5 border-l border-outline-variant first:border-l-0 transition-colors"
            :class="statusFilter === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
            @click="statusFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <label class="inline-flex items-center gap-2 cursor-pointer text-on-surface">
          <input v-model="semuaPeriode" type="checkbox" class="h-4 w-4 accent-primary" />
          Termasuk semester ini
        </label>
        <div class="lg:ml-auto w-full lg:w-64 [&>div]:!w-full">
          <SearchInput v-model="search" placeholder="Cari judul / mata kuliah..." />
        </div>
      </section>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else-if="!tampil.length" class="p-10 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
        <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 40px">history</span>
        <p class="mt-2 text-body-md text-on-surface">
          {{ data?.periode.length ? 'Tidak ada konten yang cocok dengan filter.' : 'Belum ada riwayat belajar dari semester sebelumnya.' }}
        </p>
        <p v-if="!data?.periode.length && !semuaPeriode" class="mt-1 text-body-sm text-on-surface-variant">
          Riwayat terisi setelah semester berganti. Centang <strong>Termasuk semester ini</strong> untuk melihat progres semester berjalan.
        </p>
      </div>

      <!-- Per periode -->
      <section v-for="p in tampil" v-else :key="p.id" class="mb-8">
        <div class="flex flex-wrap items-end gap-3 mb-3">
          <h2 class="text-headline-sm font-semibold text-on-surface">{{ p.nama }}</h2>
          <span v-if="p.aktif" class="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-label-sm">Semester berjalan</span>
          <p class="ml-auto text-body-sm text-on-surface-variant">
            {{ p.ringkasan.selesai }}/{{ p.ringkasan.jumlah }} konten selesai ({{ persen(p.ringkasan) }}%)
            <template v-if="p.ringkasan.rataKuis !== null"> · rata-rata kuis {{ angka(p.ringkasan.rataKuis) }}</template>
          </p>
        </div>

        <div class="space-y-3">
          <article v-for="k in p.kelas" :key="k.jadwalKuliahId" class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <button
              type="button"
              class="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-container-low"
              :aria-expanded="!tertutup.has(kunci(p.id, k.jadwalKuliahId))"
              @click="toggle(kunci(p.id, k.jadwalKuliahId))"
            >
              <MataKuliahIlustrasi :nama="k.namaMataKuliah" :kode="k.kodeMataKuliah" :ikon="k.ikon" ukuran="sm" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-on-surface">{{ k.namaMataKuliah }}</p>
                <p class="text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.sks ?? 0 }} SKS</p>
              </div>
              <div class="hidden sm:block w-40">
                <div class="flex justify-between text-label-sm text-on-surface-variant mb-1">
                  <span>{{ k.ringkasan.selesai }}/{{ k.ringkasan.jumlah }} selesai</span>
                  <span class="font-semibold text-on-surface">{{ persen(k.ringkasan) }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div class="h-full rounded-full bg-primary" :style="{ width: `${persen(k.ringkasan)}%` }" />
                </div>
              </div>
              <span class="material-symbols-outlined text-on-surface-variant transition-transform" :class="{ 'rotate-180': !tertutup.has(kunci(p.id, k.jadwalKuliahId)) }">
                expand_more
              </span>
            </button>

            <ul v-if="!tertutup.has(kunci(p.id, k.jadwalKuliahId))" class="divide-y divide-outline-variant border-t border-outline-variant">
              <li v-for="c in k.konten" :key="c.id" class="flex items-center gap-3 px-4 py-3 text-body-sm">
                <span class="material-symbols-outlined rounded-md p-1.5 shrink-0" :class="JENIS[c.jenis].cls" style="font-size: 18px" :title="JENIS[c.jenis].label">
                  {{ JENIS[c.jenis].icon }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-on-surface truncate">
                    {{ c.judul }}
                    <span v-if="c.isWajib" class="ml-1 px-1.5 py-0.5 rounded bg-[#d83b3b] text-white text-label-sm font-semibold align-middle">Wajib</span>
                  </p>
                  <p class="text-label-sm text-on-surface-variant">
                    {{ JENIS[c.jenis].label }}<template v-if="c.pertemuanKe"> · Sesi {{ c.pertemuanKe }}</template><template v-if="c.dosen"> · {{ c.dosen }}</template>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm" :class="STATUS[c.status].cls">
                    <span class="material-symbols-outlined" style="font-size: 14px">{{ STATUS[c.status].icon }}</span>
                    {{ STATUS[c.status].label }}
                  </span>
                  <p class="mt-0.5 text-label-sm text-on-surface-variant">
                    {{ keterangan(c) }}<template v-if="c.selesaiPada"> · {{ formatDateTime(c.selesaiPada) }}</template>
                  </p>
                </div>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </ElearningShell>
  </div>
</template>
