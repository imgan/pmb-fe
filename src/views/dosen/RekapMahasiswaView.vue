<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenJadwalApi, dosenKelasApi, type RekapKehadiranKelas, type StatusPresensi } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/** true = ditampilkan sebagai tab di halaman Rekap (header halaman disembunyikan). */
defineProps<{ embedded?: boolean }>();

/**
 * Rekap mahasiswa per kelas: daftar peserta (KRS disetujui) beserta kehadiran detail per pertemuan
 * (H/I/S/A), total, dan persentase hadir. Bisa dicetak PDF.
 */
const jadwalOptions = ref<{ value: number; label: string }[]>([]);
const selectedJadwalId = ref<number | ''>('');
const appliedJadwalId = ref<number | ''>('');

const data = ref<RekapKehadiranKelas | null>(null);
const search = ref('');
const loading = ref(false);
const printing = ref(false);
const error = ref<string | null>(null);

const KODE: Record<StatusPresensi, string> = { HADIR: 'H', IZIN: 'I', SAKIT: 'S', ALPA: 'A' };
const KODE_CLASS: Record<StatusPresensi, string> = {
  HADIR: 'text-[#059669] font-semibold',
  IZIN: 'text-[#B45309] font-semibold',
  SAKIT: 'text-[#2563EB] font-semibold',
  ALPA: 'text-error font-semibold',
};

onMounted(async () => {
  try {
    const jadwalList = await dosenJadwalApi.listMine();
    jadwalOptions.value = jadwalList.map((j) => ({
      value: j.id,
      label: `[${j.kodeMataKuliah}]${j.namaMataKuliah}-${j.kelas}`,
    }));
  } catch {
    jadwalOptions.value = [];
  }
});

const handleTampilkan = async () => {
  appliedJadwalId.value = selectedJadwalId.value;
  data.value = null;
  error.value = null;
  if (!appliedJadwalId.value) return;
  loading.value = true;
  try {
    data.value = await dosenKelasApi.rekapKehadiran(Number(appliedJadwalId.value));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat rekap mahasiswa');
  } finally {
    loading.value = false;
  }
};

const rows = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = data.value?.mahasiswa ?? [];
  return q ? list.filter((m) => m.nim.toLowerCase().includes(q) || m.namaLengkap.toLowerCase().includes(q)) : list;
});

const handleCetak = async () => {
  if (!appliedJadwalId.value) return;
  printing.value = true;
  try {
    openBlob(await dosenKelasApi.pdf(Number(appliedJadwalId.value), 'rekap-kehadiran'));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka cetakan rekap kehadiran'));
  } finally {
    printing.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" title="Rekap Mahasiswa" subtitle="Dosen / Harian / Rekap Mahasiswa" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-96">
          <SelectInput v-model="selectedJadwalId" placeholder="-- Pilih Matakuliah --" :options="jadwalOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <AppButton v-if="data" variant="secondary" icon="print" :disabled="printing" @click="handleCetak">
          {{ printing ? 'Membuka...' : 'Cetak Rekap Kehadiran' }}
        </AppButton>
      </div>

      <div v-if="data" class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p class="text-body-sm text-on-surface-variant">
          {{ data.kelas.kodeMataKuliah }} · {{ data.kelas.namaMataKuliah }} · Kelas {{ data.kelas.kelas }} ·
          {{ data.mahasiswa.length }} mahasiswa · {{ data.pertemuan.length }} pertemuan
        </p>
        <div class="w-full md:w-72">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else-if="!data" class="p-8 text-center text-body-sm text-on-surface-variant">Pilih matakuliah lalu klik Tampilkan</div>
      <div v-else-if="!data.mahasiswa.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada mahasiswa (KRS disetujui) pada mata kuliah ini
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant text-label-md text-primary">
            <tr>
              <th class="p-3 font-semibold">No</th>
              <th class="p-3 font-semibold">NIM</th>
              <th class="p-3 font-semibold">Nama Mahasiswa</th>
              <th
                v-for="p in data.pertemuan"
                :key="p.id"
                class="p-2 font-semibold text-center whitespace-nowrap"
                :title="`Pertemuan ke-${p.pertemuanKe} · ${formatDate(p.tanggal)}`"
              >
                P{{ p.pertemuanKe }}
                <span class="block text-label-sm font-normal text-on-surface-variant">{{ formatDate(p.tanggal) }}</span>
              </th>
              <th class="p-2 font-semibold text-center">H</th>
              <th class="p-2 font-semibold text-center">I</th>
              <th class="p-2 font-semibold text-center">S</th>
              <th class="p-2 font-semibold text-center">A</th>
              <th class="p-2 font-semibold text-center">% Hadir</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="m in rows" :key="m.mahasiswaId" class="hover:bg-surface-container">
              <td class="p-3">{{ m.no }}</td>
              <td class="p-3 whitespace-nowrap">{{ m.nim }}</td>
              <td class="p-3">{{ m.namaLengkap }}</td>
              <td v-for="(s, i) in m.status" :key="i" class="p-2 text-center" :class="s ? KODE_CLASS[s] : 'text-on-surface-variant'">
                {{ s ? KODE[s] : '-' }}
              </td>
              <td class="p-2 text-center tabular-nums">{{ m.hadir }}</td>
              <td class="p-2 text-center tabular-nums">{{ m.izin }}</td>
              <td class="p-2 text-center tabular-nums">{{ m.sakit }}</td>
              <td class="p-2 text-center tabular-nums">{{ m.alpa }}</td>
              <td class="p-2 text-center tabular-nums font-medium" :class="m.persen < 75 && data.pertemuan.length ? 'text-error' : ''">
                {{ m.persen }}%
              </td>
            </tr>
          </tbody>
        </table>
        <p class="p-4 text-label-sm text-on-surface-variant">
          H = Hadir, I = Izin, S = Sakit, A = Alpa, - = belum diisi. Persentase merah = di bawah 75%.
        </p>
      </div>
    </section>
  </div>
</template>
