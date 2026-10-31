<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { useKelasKuliahApi, type PresensiKelas, type StatusPresensi } from '@/api/kelasKuliah';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';

/**
 * Detail Kelas → Presensi Kelas: kehadiran peserta (KRS disetujui) per pertemuan yang sudah direalisasikan
 * dosen (input presensi di portal Dosen), beserta rekap H/I/S/A & persentase kehadiran tiap mahasiswa.
 */
const props = defineProps<{ kelasId: number }>();
const kelasKuliahApi = useKelasKuliahApi();

const data = ref<PresensiKelas | null>(null);
const error = ref<string | null>(null);
const load = async () => {
  error.value = null;
  try {
    data.value = await kelasKuliahApi.presensi(props.kelasId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat presensi kelas');
  }
};
onMounted(load);
watch(() => props.kelasId, load);

const KODE: Record<StatusPresensi, { huruf: string; cls: string; label: string }> = {
  HADIR: { huruf: 'H', cls: 'bg-[#059669]/15 text-[#05603a]', label: 'Hadir' },
  IZIN: { huruf: 'I', cls: 'bg-[#2563eb]/15 text-[#1e40af]', label: 'Izin' },
  SAKIT: { huruf: 'S', cls: 'bg-[#eda100]/20 text-[#7a5200]', label: 'Sakit' },
  ALPA: { huruf: 'A', cls: 'bg-error-container text-error', label: 'Alpa' },
};
/** Minimal kehadiran yang ditandai (umum dipakai syarat ujian). */
const BATAS = 75;

const search = ref('');
const tampil = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = data.value?.mahasiswa ?? [];
  return q ? list.filter((m) => m.nim.toLowerCase().includes(q) || m.namaLengkap.toLowerCase().includes(q)) : list;
});
const kartu = computed(() => {
  const r = data.value?.ringkasan;
  return [
    { label: 'Pertemuan Terlaksana', nilai: r?.jumlahPertemuan ?? 0, icon: 'event_available' },
    { label: 'Peserta', nilai: r?.jumlahMahasiswa ?? 0, icon: 'groups' },
    { label: 'Rata-rata Kehadiran', nilai: `${r?.persenHadir ?? 0}%`, icon: 'percent' },
    { label: 'Alpa', nilai: r?.ALPA ?? 0, icon: 'person_off' },
  ];
});
</script>

<template>
  <div class="space-y-4">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <template v-if="data">
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
        <div class="px-4 py-3 border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex-1 text-body-sm text-on-surface-variant">
            <span v-for="(v, k) in KODE" :key="k" class="inline-flex items-center gap-1 mr-3">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded text-label-sm font-semibold" :class="v.cls">{{ v.huruf }}</span>
              {{ v.label }}
            </span>
            <span class="inline-flex items-center gap-1">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded text-label-sm bg-surface-container text-on-surface-variant">·</span>
              Belum diisi
            </span>
          </div>
          <div class="w-full md:w-64 [&>div]:!w-full">
            <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
          </div>
        </div>

        <div v-if="!data.pertemuan.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada pertemuan yang direalisasikan dosen, jadi presensi belum tersedia.
        </div>
        <div v-else-if="!tampil.length" class="p-8 text-center text-body-sm text-on-surface-variant">Tidak ada peserta</div>
        <div v-else class="overflow-auto max-h-[70vh]">
          <table class="w-full text-body-sm border-collapse">
            <thead class="bg-primary text-on-primary sticky top-0 z-10">
              <tr>
                <th class="p-2.5 text-left w-10">No</th>
                <th class="p-2.5 text-left">NIM</th>
                <th class="p-2.5 text-left min-w-48 sticky left-0 bg-primary">Nama Mahasiswa</th>
                <th v-for="p in data.pertemuan" :key="p.id" class="p-1.5 text-center min-w-9 border-l border-on-primary/20" :title="formatDate(p.tanggal)">
                  {{ p.pertemuanKe }}
                </th>
                <th class="p-2 text-center border-l border-on-primary/30">H</th>
                <th class="p-2 text-center">I</th>
                <th class="p-2 text-center">S</th>
                <th class="p-2 text-center">A</th>
                <th class="p-2 text-center border-l border-on-primary/30">Kehadiran</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-for="m in tampil" :key="m.mahasiswaId" class="hover:bg-surface-container">
                <td class="p-2.5">{{ m.no }}</td>
                <td class="p-2.5 whitespace-nowrap">{{ m.nim }}</td>
                <td class="p-2.5 sticky left-0 bg-surface-container-lowest">{{ m.namaLengkap }}</td>
                <td v-for="(s, i) in m.status" :key="i" class="p-1 text-center border-l border-outline-variant">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 rounded text-label-sm font-semibold"
                    :class="s ? KODE[s].cls : 'bg-surface-container text-on-surface-variant'"
                    :title="s ? KODE[s].label : 'Belum diisi'"
                  >
                    {{ s ? KODE[s].huruf : '·' }}
                  </span>
                </td>
                <td class="p-2 text-center tabular-nums border-l border-outline-variant">{{ m.hadir }}</td>
                <td class="p-2 text-center tabular-nums">{{ m.izin }}</td>
                <td class="p-2 text-center tabular-nums">{{ m.sakit }}</td>
                <td class="p-2 text-center tabular-nums" :class="m.alpa ? 'text-error font-semibold' : ''">{{ m.alpa }}</td>
                <td class="p-2 text-center tabular-nums font-semibold border-l border-outline-variant" :class="m.persen < BATAS ? 'text-error' : 'text-[#05603a]'">
                  {{ m.persen }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="data.pertemuan.length" class="px-4 py-2 border-t border-outline-variant text-label-sm text-on-surface-variant">
          Kehadiran = hadir ÷ pertemuan terlaksana; di bawah {{ BATAS }}% ditandai merah. Arahkan kursor ke nomor pertemuan untuk melihat tanggalnya.
        </p>
      </section>
    </template>
    <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat presensi...</div>
  </div>
</template>
