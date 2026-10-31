<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenKelasApi, dosenRekapRealisasiApi, type RekapRealisasiDosen } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/** true = ditampilkan sebagai tab di halaman Rekap (header halaman disembunyikan). */
defineProps<{ embedded?: boolean }>();

/**
 * Rekap realisasi mengajar per kelas yang diampu dosen (seperti BAAK → Cetak Realisasi Mengajar):
 * jumlah realisasi per status, persentase terhadap 16 pertemuan, dan cetak realisasi per kelas.
 */
const items = ref<RekapRealisasiDosen[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const printingId = ref<number | null>(null);

onMounted(async () => {
  try {
    items.value = await dosenRekapRealisasiApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat rekap realisasi');
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((r) => [r.kelas, r.kodeMataKuliah, r.namaMataKuliah].some((v) => v?.toLowerCase().includes(q)));
});
const total = computed(() => ({
  kelas: filtered.value.length,
  hadir: filtered.value.reduce((s, r) => s + r.hadir, 0),
}));

const cetak = async (id: number) => {
  printingId.value = id;
  try {
    openBlob(await dosenKelasApi.pdf(id, 'realisasi'));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka cetak realisasi'));
  } finally {
    printingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" title="Rekap Realisasi" subtitle="Dosen / Harian / Rekap Realisasi" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-surface-bright">
        <p class="text-body-sm text-on-surface-variant">
          {{ total.kelas }} kelas · {{ total.hadir }} realisasi hadir · target 16 pertemuan per kelas
        </p>
        <div class="w-full md:w-80">
          <SearchInput v-model="search" placeholder="Cari kelas, kode, atau mata kuliah..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat rekap realisasi...</div>
      <div v-else-if="!filtered.length" class="p-6 text-center text-body-sm text-on-surface-variant">Tidak ada kelas yang diampu pada tahun akademik ini.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 text-center">No</th>
              <th class="p-3 text-left">Hari / Jam</th>
              <th class="p-3 text-left">Kelas</th>
              <th class="p-3 text-left">Kode MK</th>
              <th class="p-3 text-left">Mata Kuliah</th>
              <th class="p-3 text-left">Ruang</th>
              <th class="p-3 text-center">Hadir</th>
              <th class="p-3 text-center">Izin</th>
              <th class="p-3 text-center">Sakit</th>
              <th class="p-3 text-center">Tidak Hadir</th>
              <th class="p-3 text-center">Realisasi</th>
              <th class="p-3 text-left">Terakhir</th>
              <th class="p-3 text-center">Cetak</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="(r, i) in filtered" :key="r.id">
              <td class="p-3 text-center">{{ i + 1 }}</td>
              <td class="p-3 whitespace-nowrap">{{ r.hariJam }}</td>
              <td class="p-3">{{ r.kelas }}</td>
              <td class="p-3 whitespace-nowrap">{{ r.kodeMataKuliah }}</td>
              <td class="p-3 min-w-48">
                <span class="block text-on-surface">{{ r.namaMataKuliah }}</span>
                <span class="block text-label-sm text-on-surface-variant">{{ r.peran }}<template v-if="r.peran === 'Pengampu'"> · koordinator {{ r.dosenKordinator ?? '-' }}</template></span>
              </td>
              <td class="p-3">{{ r.ruangan || '-' }}</td>
              <td class="p-3 text-center font-medium">{{ r.hadir }}</td>
              <td class="p-3 text-center">{{ r.izin }}</td>
              <td class="p-3 text-center">{{ r.sakit }}</td>
              <td class="p-3 text-center" :class="r.tidakHadir ? 'text-error font-medium' : ''">{{ r.tidakHadir }}</td>
              <td class="p-3 text-center whitespace-nowrap">
                <span class="font-semibold" :class="r.persen < 75 ? 'text-error' : 'text-on-surface'">{{ r.hadir }}/16</span>
                <span class="block text-label-sm text-on-surface-variant">{{ r.persen }}%</span>
              </td>
              <td class="p-3 whitespace-nowrap">{{ r.realisasiTerakhir ? formatDate(r.realisasiTerakhir) : '-' }}</td>
              <td class="p-3 text-center">
                <AppButton variant="secondary" icon="print" :disabled="printingId === r.id" @click="cetak(r.id)">
                  {{ printingId === r.id ? 'Membuka...' : 'Cetak' }}
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="px-4 py-3 text-label-sm text-on-surface-variant border-t border-outline-variant">
        Realisasi = pertemuan berstatus Hadir dibanding target 16 pertemuan; merah = di bawah 75%. Cetak menghasilkan Realisasi Dosen Mengajar.
      </p>
    </section>
  </div>
</template>
