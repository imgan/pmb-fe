<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { mahasiswaKrsApi, mahasiswaTahunAjaranApi } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import type { Krs, TahunAjaran } from '@/types/entities';

const tahunAjaranAktif = ref<TahunAjaran | null>(null);
const krsList = ref<Krs[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const HARI_LABEL: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
  MINGGU: 'Minggu',
};

const jadwalList = computed(() =>
  krsList.value.flatMap((krs) => krs.detailList ?? []).filter((d) => d.kelasKuliah)
);

onMounted(async () => {
  try {
    tahunAjaranAktif.value = await mahasiswaTahunAjaranApi.aktif();
    krsList.value = await mahasiswaKrsApi.list(
      tahunAjaranAktif.value ? { tahunAjaranId: tahunAjaranAktif.value.id } : {}
    );
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jadwal kuliah');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Jadwal Kuliah</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Jadwal kuliah berdasarkan KRS Anda pada tahun ajaran {{ tahunAjaranAktif?.nama ?? '-' }}.
      </p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Jadwal Kuliah</div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

      <div v-else class="divide-y divide-outline-variant">
        <div v-for="d in jadwalList" :key="d.id" class="px-4 py-3">
          <p class="text-body-md text-on-surface font-medium">
            [{{ d.kelasKuliah?.kodeMataKuliah }}] {{ d.kelasKuliah?.namaMataKuliah }}
            <span class="text-body-sm text-on-surface-variant">({{ d.kelasKuliah?.sks ?? 0 }} SKS)</span>
          </p>
          <p class="text-body-sm text-on-surface-variant">
            Kelas {{ d.kelasKuliah?.kelas }} &middot; {{ d.kelasKuliah?.dosenKordinator?.namaLengkap ?? '-' }}
          </p>
          <p class="text-body-sm text-on-surface-variant">
            {{ (d.kelasKuliah?.hari ?? []).map((h) => HARI_LABEL[h] ?? h).join(', ') || '-' }}
            <span v-if="d.kelasKuliah?.jam">&middot; Jam ke-{{ d.kelasKuliah.jam }}</span>
            <span v-if="d.kelasKuliah?.ruangan">&middot; Ruang {{ d.kelasKuliah.ruangan }}</span>
          </p>
        </div>

        <p v-if="!jadwalList.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada jadwal kuliah. Silakan isi KRS terlebih dahulu.
        </p>
      </div>
    </section>
  </div>
</template>
