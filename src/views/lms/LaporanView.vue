<script setup lang="ts">
import { computed, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import LmsFilterBar from '@/components/lms/LmsFilterBar.vue';
import ProgresBar from '@/components/lms/ProgresBar.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { useLmsData } from '@/composables/useLmsFilter';
import { usePaginasi } from '@/composables/usePaginasi';
import { lmsConsoleApi, type LmsLaporan } from '@/api/lmsConsole';
import { extractErrorMessage } from '@/api/http';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import { teksAngka } from '@/utils/lmsKonten';

/** LMS → Laporan Aktivitas: rekap e-learning per prodi & per kelas (tahun akademik terpilih) + export Excel. */
const search = ref('');
const { data, loading, error, filter } = useLmsData<LmsLaporan>(lmsConsoleApi.laporan, () => ({ search: search.value }), 'Gagal memuat laporan');
const perProdi = computed(() => data.value?.perProdi ?? []);
const kelasBerkonten = computed(() => (data.value?.perKelas ?? []).filter((k) => k.totalKonten));
const { page, limit, meta, halaman } = usePaginasi(kelasBerkonten);
const total = computed(() => {
  const p = perProdi.value;
  const jml = (f: (x: (typeof p)[number]) => number) => p.reduce((s, x) => s + f(x), 0);
  const peserta = jml((x) => x.peserta);
  const penugasan = jml((x) => x.penugasan);
  return {
    kelas: jml((x) => x.kelas),
    kelasDenganKonten: jml((x) => x.kelasDenganKonten),
    konten: jml((x) => x.konten),
    peserta,
    mahasiswaAktif: jml((x) => x.mahasiswaAktif),
    keaktifan: peserta ? Math.round((jml((x) => x.mahasiswaAktif) / peserta) * 10000) / 100 : null,
    penyelesaian: penugasan ? Math.round((jml((x) => x.selesai) / penugasan) * 10000) / 100 : null,
    tugasBelumDinilai: jml((x) => x.tugasBelumDinilai),
  };
});

const mengunduh = ref(false);
const unduh = async () => {
  mengunduh.value = true;
  try {
    downloadBlob(
      await lmsConsoleApi.exportLaporan({ tahunAjaranId: filter.tahunAjaranId, kodeProdi: filter.kodeProdi, search: search.value }),
      'laporan-aktivitas-lms.xlsx',
    );
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh laporan'));
  } finally {
    mengunduh.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Laporan Aktivitas" subtitle="LMS / Laporan Aktivitas — rekap e-learning per prodi dan per kelas.">
      <template #actions>
        <AppButton variant="secondary" icon="download" :disabled="mengunduh" @click="unduh">{{ mengunduh ? 'Mengunduh...' : 'Export Excel' }}</AppButton>
      </template>
    </PageHeader>
    <LmsFilterBar v-model:search="search" placeholder="Cari mata kuliah, kelas, dosen..." />
    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <h2 class="text-headline-sm font-semibold text-on-surface mb-3">Per prodi</h2>
    <div class="mb-8 rounded-xl border border-outline-variant bg-surface-container-lowest overflow-x-auto" :class="{ 'opacity-60': loading }">
      <table class="w-full text-body-sm">
        <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
          <tr>
            <th class="text-left font-semibold px-4 py-3">Prodi</th>
            <th class="text-center font-semibold px-2 py-3">Kelas</th>
            <th class="text-center font-semibold px-2 py-3">Kelas berkonten</th>
            <th class="text-center font-semibold px-2 py-3">Konten</th>
            <th class="text-center font-semibold px-2 py-3">Mhs aktif / peserta</th>
            <th class="text-left font-semibold px-3 py-3">Keaktifan</th>
            <th class="text-left font-semibold px-3 py-3">Penyelesaian</th>
            <th class="text-center font-semibold px-2 py-3">Tugas belum dinilai</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && !perProdi.length"><td colspan="8" class="px-4 py-10 text-center text-on-surface-variant">Tidak ada data.</td></tr>
          <tr v-for="p in perProdi" :key="p.kodeProdi ?? p.prodi" class="border-t border-outline-variant">
            <td class="px-4 py-2.5 font-medium text-on-surface">{{ p.prodi }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ p.kelas }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ p.kelasDenganKonten }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ p.konten }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ p.mahasiswaAktif }} / {{ p.peserta }}</td>
            <td class="px-3 py-2.5"><ProgresBar :nilai="p.konten ? p.keaktifan : null" /></td>
            <td class="px-3 py-2.5"><ProgresBar :nilai="p.penyelesaian" /></td>
            <td class="px-2 py-2.5 text-center tabular-nums" :class="p.tugasBelumDinilai ? 'text-[#b45309] font-semibold' : ''">{{ p.tugasBelumDinilai }}</td>
          </tr>
        </tbody>
        <tfoot v-if="perProdi.length > 1" class="border-t-2 border-outline-variant bg-surface-container-low font-semibold">
          <tr>
            <td class="px-4 py-2.5">Total</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ total.kelas }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ total.kelasDenganKonten }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ total.konten }}</td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ total.mahasiswaAktif }} / {{ total.peserta }}</td>
            <td class="px-3 py-2.5"><ProgresBar :nilai="total.konten ? total.keaktifan : null" /></td>
            <td class="px-3 py-2.5"><ProgresBar :nilai="total.penyelesaian" /></td>
            <td class="px-2 py-2.5 text-center tabular-nums">{{ total.tugasBelumDinilai }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-headline-sm font-semibold text-on-surface">
        Per kelas
        <span class="text-body-sm font-normal text-on-surface-variant">(kelas yang sudah memiliki konten)</span>
      </h2>
      <PageSizeSelect v-model="limit" />
    </div>
    <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden" :class="{ 'opacity-60': loading }">
      <div class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Mata Kuliah</th>
              <th class="text-left font-semibold px-3 py-3">Dosen</th>
              <th class="text-center font-semibold px-2 py-3">Materi</th>
              <th class="text-center font-semibold px-2 py-3">Video</th>
              <th class="text-center font-semibold px-2 py-3">Kuis</th>
              <th class="text-center font-semibold px-2 py-3">Tugas</th>
              <th class="text-left font-semibold px-3 py-3">Keaktifan</th>
              <th class="text-left font-semibold px-3 py-3">Penyelesaian</th>
              <th class="text-center font-semibold px-2 py-3">Rata kuis</th>
              <th class="text-center font-semibold px-2 py-3">Rata tugas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !kelasBerkonten.length">
              <td colspan="10" class="px-4 py-10 text-center text-on-surface-variant">Belum ada kelas yang memiliki konten.</td>
            </tr>
            <tr v-for="k in halaman" :key="k.id" class="border-t border-outline-variant">
              <td class="px-4 py-2.5">
                <RouterLink :to="{ name: 'lms-kelas-detail', params: { id: k.id } }" class="hover:text-primary">
                  <span class="block font-medium">{{ k.namaMataKuliah }}</span>
                  <span class="block text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.prodi ?? '-' }}</span>
                </RouterLink>
              </td>
              <td class="px-3 py-2.5">{{ k.dosen ?? '-' }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums">{{ k.jumlah.materi }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums">{{ k.jumlah.video }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums">{{ k.jumlah.kuis }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums">{{ k.jumlah.tugas }}</td>
              <td class="px-3 py-2.5"><ProgresBar :nilai="k.keaktifan" :keterangan="`${k.mahasiswaAktif}/${k.peserta}`" /></td>
              <td class="px-3 py-2.5"><ProgresBar :nilai="k.penyelesaian" :keterangan="`${k.selesai}/${k.penugasan}`" /></td>
              <td class="px-2 py-2.5 text-center tabular-nums">{{ teksAngka(k.rataKuis) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums">{{ teksAngka(k.rataTugas) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-model="page" :meta="meta" />
    </div>
  </div>
</template>
