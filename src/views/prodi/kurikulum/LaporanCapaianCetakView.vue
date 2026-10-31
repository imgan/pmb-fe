<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import LaporanCplMataKuliah from '@/components/laporan/LaporanCplMataKuliah.vue';
import TranskripObe from '@/components/laporan/TranskripObe.vue';
import { laporanCapaianApi, type LaporanCplMataKuliah as DataLaporan, type TranskripObe as DataTranskrip } from '@/api/laporanCapaian';
import { publicApi } from '@/api/public';
import { extractErrorMessage } from '@/api/http';

/**
 * Versi cetak Laporan Capaian OBE (dibuka lewat "Lihat di Tab Baru"): halaman polos tanpa sidebar,
 * parameter dari query (kurikulumId, angkatan, mahasiswaId, kop). Tombol Cetak memanggil dialog cetak browser.
 */
const route = useRoute();
const data = ref<DataLaporan | null>(null);
const transkrip = ref<DataTranskrip | null>(null);
const jenis = route.query.jenis === 'TRANSKRIP_OBE' ? 'TRANSKRIP_OBE' : 'CPL_MK';
const kampus = ref<{ namaKampus?: string | null; alamat?: string | null; logoUrl?: string | null } | null>(null);
const error = ref<string | null>(null);
const kop = route.query.kop !== '0';
const cetak = () => window.print();
const angka = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));

onMounted(async () => {
  try {
    const q = { kurikulumId: Number(route.query.kurikulumId), angkatan: angka(route.query.angkatan), mahasiswaId: angka(route.query.mahasiswaId) };
    const [laporan, k] = await Promise.all([
      jenis === 'TRANSKRIP_OBE' ? laporanCapaianApi.transkripObe(q) : laporanCapaianApi.cplPerMataKuliah(q),
      publicApi.kampus().catch(() => null),
    ]);
    if (jenis === 'TRANSKRIP_OBE') transkrip.value = laporan as DataTranskrip;
    else data.value = laporan;
    kampus.value = k;
    document.title = `${jenis === 'TRANSKRIP_OBE' ? 'Transkrip OBE' : 'CPL per Mata Kuliah'}${laporan.mahasiswa ? ` - ${laporan.mahasiswa.nim}` : ''}`;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat laporan');
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#e5e7eb] print:bg-white py-6 print:py-0">
    <div class="max-w-[1100px] mx-auto mb-3 px-4 flex justify-end gap-2 print:hidden">
      <button type="button" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#16467e] text-white text-sm hover:opacity-90" @click="cetak">
        <span class="material-symbols-outlined" style="font-size: 18px">print</span>
        Cetak / Simpan PDF
      </button>
    </div>
    <div class="max-w-[1100px] mx-auto bg-white shadow print:shadow-none p-8 print:p-0">
      <p v-if="error" class="text-red-700">{{ error }}</p>
      <TranskripObe v-else-if="transkrip" :data="transkrip" :kop="kop" :kampus="kampus" />
      <LaporanCplMataKuliah v-else-if="data" :data="data" :kop="kop" :kampus="kampus" />
      <p v-else class="text-gray-500">Memuat laporan...</p>
    </div>
  </div>
</template>
