<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useKelasKuliahApi, type JadwalPerkuliahan, type KelasKuliahDetail, type StatusRealisasi } from '@/api/kelasKuliah';
import AppButton from '@/components/ui/AppButton.vue';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';

// Klien sesuai portal (Prodi / Dosen) dari halaman detail kelas.
const kelasKuliahApi = useKelasKuliahApi();

/**
 * Detail Kelas Kuliah → Jadwal Perkuliahan: pertemuan 1..N — rencana dari RPS Pertemuan mata kuliah
 * dibandingkan realisasi mengajar dosen (portal Dosen) beserta rekap presensi mahasiswa per pertemuan.
 */
const props = defineProps<{ kelasId: number; info?: KelasKuliahDetail | null }>();

const data = ref<JadwalPerkuliahan | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await kelasKuliahApi.jadwalPerkuliahan(props.kelasId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jadwal perkuliahan');
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(() => props.kelasId, load);

const STATUS: Record<StatusRealisasi, { label: string; cls: string }> = {
  HADIR: { label: 'Terlaksana', cls: 'bg-[#059669]/15 text-[#05603a]' },
  TIDAK_HADIR: { label: 'Tidak Hadir', cls: 'bg-error-container text-on-error-container' },
  IZIN: { label: 'Izin', cls: 'bg-[#eda100]/20 text-[#7a5200]' },
  SAKIT: { label: 'Sakit', cls: 'bg-[#eda100]/20 text-[#7a5200]' },
};
const JENIS_CLS: Record<string, string> = {
  UTS: 'bg-[#2563eb]/15 text-[#1e40af]',
  UAS: 'bg-[#7c3aed]/15 text-[#5b21b6]',
};

const filter = ref<'semua' | 'terlaksana' | 'belum'>('semua');
const baris = computed(() =>
  (data.value?.pertemuan ?? []).filter((p) => {
    const ok = p.realisasi.some((r) => r.status === 'HADIR');
    return filter.value === 'semua' || (filter.value === 'terlaksana' ? ok : !ok);
  })
);
const kartu = computed(() => {
  const r = data.value?.ringkasan;
  return [
    { label: 'Jumlah Pertemuan', nilai: r?.jumlahPertemuan ?? 0, icon: 'event_note' },
    { label: 'Terlaksana', nilai: r?.terlaksana ?? 0, icon: 'event_available' },
    { label: 'Belum Terlaksana', nilai: (r?.jumlahPertemuan ?? 0) - (r?.terlaksana ?? 0), icon: 'event_busy' },
    { label: 'Ketercapaian', nilai: `${r?.persentase ?? 0}%`, icon: 'percent' },
  ];
});
// ---- Detail Jadwal satu pertemuan (klik nomor pertemuan) ----
type Pertemuan = JadwalPerkuliahan['pertemuan'][number];
const dipilih = ref<Pertemuan | null>(null);
watch(() => props.kelasId, () => (dipilih.value = null));
const BENTUK: Record<string, string> = { LURING: 'Offline (Luring)', DARING: 'Online (Daring)', HYBRID: 'Hybrid' };
/** Tanggal panjang, mis. "15 Januari 2030". */
const tanggalPanjang = (v: string | null | undefined) => {
  if (!v) return '-';
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};
const detailJadwal = computed(() => {
  const p = dipilih.value;
  if (!p) return null;
  const r = p.realisasi[0] ?? null;
  const k = props.info?.kelas;
  const status = r ? (STATUS[r.status]?.label ?? r.status) : p.rencana ? 'Terjadwal' : 'Belum dijadwalkan';
  const kiri: [string, string][] = [
    ['Sesi', String(p.pertemuanKe)],
    ['Tanggal Jadwal', tanggalPanjang(r?.tanggal)],
    ['Waktu Mulai', r?.jamMasuk ?? '-'],
    ['Waktu Selesai', r?.jamKeluar ?? '-'],
    ['Jenis Pertemuan', p.rencana?.jenis ?? '-'],
    ['Kelompok', k?.kelas ?? '-'],
  ];
  const kanan: [string, string][] = [
    ['Status', status],
    ['Metode Pembelajaran', p.rencana?.bentuk ? (BENTUK[p.rencana.bentuk] ?? p.rencana.bentuk) : '-'],
    ['Ruang Kuliah', k?.ruangan ?? '-'],
    ['Keterangan Ruang Kuliah', k?.kapasitas ? `Kapasitas ${k.kapasitas}` : '-'],
    ['URL Kuliah Online', k?.gcr || '-'],
    ['SKS', k?.sks != null ? String(k.sks) : '-'],
  ];
  // Dosen: yang mengajar (realisasi), selain itu tim pengajar kelas.
  const dosenRealisasi = [...new Set(p.realisasi.map((x) => x.dosen).filter(Boolean))] as string[];
  const timKelas = [props.info?.dosenKoordinator, ...(props.info?.dosenPengampu ?? [])]
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => `${d.nidn} - ${d.nama}`);
  const presensi = p.realisasi.length
    ? p.realisasi.map((x) => `Hadir ${x.presensi.HADIR}, Izin ${x.presensi.IZIN}, Sakit ${x.presensi.SAKIT}, Alpa ${x.presensi.ALPA}`).join('\n')
    : '-';
  return {
    kiri,
    kanan,
    dosen: dosenRealisasi.length ? dosenRealisasi : timKelas,
    materi: [
      ['Lampiran Materi', '-'],
      ['Dokumen Presensi', presensi],
      ['Dokumen Jurnal', p.realisasi.map((x) => x.keterangan).filter(Boolean).join('\n') || '-'],
      ['Rencana Materi', p.rencana?.materi || '-'],
      ['Realisasi Materi', p.realisasi.map((x) => x.uraian).filter(Boolean).join('\n') || '-'],
    ] as [string, string][],
  };
});
const jam = (a: string | null, b: string | null) => (a || b ? `${a ?? '--:--'} – ${b ?? '--:--'}` : '-');
</script>

<template>
  <div class="space-y-4">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <!-- Detail Jadwal satu pertemuan -->
    <section v-if="data && detailJadwal" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 pt-3 flex justify-end">
        <AppButton variant="secondary" icon="arrow_back" @click="dipilih = null">Kembali ke Daftar Pertemuan</AppButton>
      </div>
      <h2 class="mx-4 pt-2 pb-2 border-b-2 border-primary font-semibold text-headline-sm text-primary">Detail Jadwal</h2>
      <div class="mx-4 grid grid-cols-1 md:grid-cols-2 md:gap-x-8 text-body-sm">
        <dl v-for="(kolom, i) in [detailJadwal.kiri, detailJadwal.kanan]" :key="i">
          <div v-for="[label, nilai] in kolom" :key="label" class="grid grid-cols-[11rem_1fr] gap-3 px-2 py-2.5 border-b border-outline-variant">
            <dt class="font-semibold text-primary">{{ label }}</dt>
            <dd class="break-all">{{ nilai }}</dd>
          </div>
        </dl>
      </div>

      <h2 class="mx-4 mt-5 pb-2 border-b-2 border-primary font-semibold text-headline-sm text-primary">Dosen Pengajar</h2>
      <dl class="mx-4 text-body-sm md:w-1/2">
        <div class="grid grid-cols-[11rem_1fr] gap-3 px-2 py-2.5 border-b border-outline-variant">
          <dt class="font-semibold text-primary">Dosen Pengajar</dt>
          <dd>
            <p v-for="d in detailJadwal.dosen" :key="d">{{ d }}</p>
            <p v-if="!detailJadwal.dosen.length">-</p>
          </dd>
        </div>
      </dl>

      <h2 class="mx-4 mt-5 pb-2 border-b-2 border-primary font-semibold text-headline-sm text-primary">Materi</h2>
      <dl class="mx-4 mb-4 text-body-sm">
        <div v-for="[label, nilai] in detailJadwal.materi" :key="label" class="grid grid-cols-[11rem_1fr] gap-3 px-2 py-2.5 border-b border-outline-variant">
          <dt class="font-semibold text-primary">{{ label }}</dt>
          <dd class="whitespace-pre-line">{{ nilai }}</dd>
        </div>
      </dl>
    </section>

    <template v-else-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="k in kartu" :key="k.label" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
          <span class="material-symbols-outlined text-primary bg-primary-container/60 rounded-full p-2" style="font-size: 20px">{{ k.icon }}</span>
          <div>
            <p class="text-label-sm text-on-surface-variant">{{ k.label }}</p>
            <p class="text-headline-sm font-semibold text-on-surface">{{ k.nilai }}</p>
          </div>
        </div>
      </div>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-outline-variant flex flex-wrap items-center gap-3">
          <div class="min-w-0">
            <h2 class="font-semibold text-primary">Rencana & Realisasi Pertemuan</h2>
            <p class="text-body-sm text-on-surface-variant">
              Klik nomor pertemuan untuk melihat detail jadwal. Rencana dari RPS{{ data.periodeRps ? ` periode ${data.periodeRps.nama}` : ' (belum diisi)' }}; realisasi dari input mengajar dosen.
            </p>
          </div>
          <div class="ml-auto inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md">
            <button
              v-for="f in [
                { key: 'semua', label: 'Semua' },
                { key: 'terlaksana', label: 'Terlaksana' },
                { key: 'belum', label: 'Belum' },
              ] as const"
              :key="f.key"
              type="button"
              class="px-3 py-1.5 border-l border-outline-variant first:border-l-0 transition-colors"
              :class="filter === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
              @click="filter = f.key"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-body-sm border-collapse">
            <thead class="bg-primary text-on-primary">
              <tr>
                <th rowspan="2" class="p-3 text-center w-14 border-r border-on-primary/20">Ke-</th>
                <th rowspan="2" class="p-3 text-left min-w-[16rem] border-r border-on-primary/20">Rencana (RPS)</th>
                <th colspan="5" class="px-3 pt-3 pb-1 text-center">Realisasi</th>
              </tr>
              <tr>
                <th class="px-3 pb-3 pt-1 text-left whitespace-nowrap">Tanggal / Jam</th>
                <th class="px-3 pb-3 pt-1 text-left">Dosen</th>
                <th class="px-3 pb-3 pt-1 text-left min-w-[14rem]">Materi Disampaikan</th>
                <th class="px-3 pb-3 pt-1 text-center whitespace-nowrap" title="Hadir / Izin / Sakit / Alpa">Presensi (H/I/S/A)</th>
                <th class="px-3 pb-3 pt-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant align-top">
              <tr v-if="!baris.length">
                <td colspan="7" class="p-6 text-center text-on-surface-variant">Tidak ada pertemuan</td>
              </tr>
              <template v-for="p in baris" :key="p.pertemuanKe">
                <tr v-for="(r, i) in p.realisasi.length ? p.realisasi : [null]" :key="r?.id ?? `kosong-${p.pertemuanKe}`">
                  <template v-if="i === 0">
                    <td :rowspan="Math.max(p.realisasi.length, 1)" class="p-3 text-center border-r border-outline-variant">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-md font-semibold text-primary border border-primary/40 hover:bg-primary-container"
                        :title="`Detail jadwal pertemuan ${p.pertemuanKe}`"
                        @click="dipilih = p"
                      >
                        {{ p.pertemuanKe }}
                      </button>
                    </td>
                    <td :rowspan="Math.max(p.realisasi.length, 1)" class="p-3 border-r border-outline-variant">
                      <template v-if="p.rencana">
                        <span class="inline-flex px-2 py-0.5 rounded-full text-label-sm mb-1" :class="JENIS_CLS[p.rencana.jenis] ?? 'bg-surface-container text-on-surface-variant'">
                          {{ p.rencana.jenis }}
                        </span>
                        <div class="whitespace-pre-line">{{ p.rencana.materi || '-' }}</div>
                        <div v-if="p.rencana.metode || p.rencana.waktu" class="mt-1 text-label-sm text-on-surface-variant">
                          {{ [p.rencana.metode, p.rencana.waktu].filter(Boolean).join(' · ') }}
                        </div>
                      </template>
                      <span v-else class="text-on-surface-variant italic">Belum ada rencana</span>
                    </td>
                  </template>
                  <template v-if="r">
                    <td class="p-3 whitespace-nowrap">
                      <div>{{ formatDate(r.tanggal) }}</div>
                      <div class="text-label-sm text-on-surface-variant">{{ jam(r.jamMasuk, r.jamKeluar) }}</div>
                    </td>
                    <td class="p-3">{{ r.dosen ?? '-' }}</td>
                    <td class="p-3">
                      <div class="whitespace-pre-line">{{ r.uraian || '-' }}</div>
                      <div v-if="r.keterangan" class="mt-1 text-label-sm text-on-surface-variant">Ket: {{ r.keterangan }}</div>
                    </td>
                    <td class="p-3 text-center whitespace-nowrap">
                      <span class="text-[#05603a] font-semibold">{{ r.presensi.HADIR }}</span> /
                      {{ r.presensi.IZIN }} / {{ r.presensi.SAKIT }} /
                      <span :class="r.presensi.ALPA ? 'text-error font-semibold' : ''">{{ r.presensi.ALPA }}</span>
                    </td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-label-sm whitespace-nowrap" :class="STATUS[r.status]?.cls">{{ STATUS[r.status]?.label ?? r.status }}</span>
                    </td>
                  </template>
                  <template v-else>
                    <td colspan="4" class="p-3 text-on-surface-variant italic">Belum ada realisasi</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant whitespace-nowrap">Belum</span>
                    </td>
                  </template>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>
    <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat jadwal perkuliahan...</div>
  </div>
</template>
