<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenElearningApi, type RingkasanDosen } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';

/**
 * Popup setelah dosen login: "Jadwal Minggu Ini" (kalender Sen–Min minggu berjalan, klik hari untuk melihat kelasnya)
 * dan "Tugas Belum Dikumpulkan" (kuis e-learning yang masih ada mahasiswa belum mengerjakan).
 */
const open = defineModel<boolean>({ default: false });
const router = useRouter();

const data = ref<RingkasanDosen | null>(null);
const error = ref<string | null>(null);
watch(
  open,
  async (v) => {
    if (!v || data.value) return;
    try {
      data.value = await dosenElearningApi.ringkasan();
    } catch (err) {
      error.value = extractErrorMessage(err, 'Gagal memuat ringkasan');
    }
  },
  { immediate: true },
);

// ---- Kalender minggu ini (Senin–Minggu) ----
const HARI = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
const SINGKAT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const hariIni = new Date();
const indeksHariIni = (hariIni.getDay() + 6) % 7; // Senin = 0
const minggu = HARI.map((nama, i) => {
  const d = new Date(hariIni);
  d.setDate(hariIni.getDate() - indeksHariIni + i);
  return { nama, singkat: SINGKAT[i], tanggal: d.getDate(), hariIni: i === indeksHariIni };
});
const dipilih = ref(indeksHariIni);
const labelHariIni = hariIni.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const jadwalHari = (nama: string) => (data.value?.jadwal ?? []).filter((j) => j.hari.includes(nama)).sort((a, b) => (a.jam ?? 99) - (b.jam ?? 99));
const kelasDipilih = computed(() => jadwalHari(HARI[dipilih.value]));
const adaKelas = (i: number) => jadwalHari(HARI[i]).length > 0;

const buka = (name: string, params?: Record<string, string | number>, query?: Record<string, string>) => {
  open.value = false;
  router.push({ name, params, query });
};
</script>

<template>
  <Modal v-model="open" title="Ringkasan Minggu Ini" :subtitle="`Hari ini: ${labelHariIni}`" size="xl">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-else-if="!data" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Jadwal Minggu Ini -->
      <section class="rounded-xl border border-outline-variant overflow-hidden">
        <div class="px-4 pt-4 pb-2">
          <h3 class="text-headline-sm font-semibold text-on-surface">Jadwal Minggu Ini</h3>
        </div>
        <div class="grid grid-cols-7 px-2 pb-3 border-b border-outline-variant">
          <button
            v-for="(h, i) in minggu"
            :key="h.nama"
            type="button"
            class="flex flex-col items-center gap-1 py-1"
            :aria-label="`${h.nama} ${h.tanggal}`"
            @click="dipilih = i"
          >
            <span class="text-label-sm" :class="dipilih === i ? 'text-primary font-semibold' : 'text-on-surface-variant'">{{ h.singkat }}</span>
            <span
              class="w-9 h-9 rounded-full flex items-center justify-center text-label-md font-semibold transition-colors"
              :class="
                dipilih === i
                  ? 'bg-primary text-on-primary'
                  : h.hariIni
                    ? 'border-2 border-primary text-primary'
                    : 'text-on-surface hover:bg-surface-container'
              "
            >
              {{ h.tanggal }}
            </span>
            <span class="w-1.5 h-1.5 rounded-full" :class="adaKelas(i) ? 'bg-primary' : 'bg-transparent'" />
          </button>
        </div>
        <div class="p-4 min-h-[13rem]">
          <div v-if="!kelasDipilih.length" class="h-full flex flex-col items-center justify-center text-center py-6">
            <span class="material-symbols-outlined text-on-surface-variant/50" style="font-size: 64px">event_busy</span>
            <p class="mt-2 text-body-sm text-on-surface-variant">Tidak ada jadwal kelas di hari {{ minggu[dipilih].nama.toLowerCase() }}.</p>
          </div>
          <ul v-else class="space-y-2.5">
            <li v-for="j in kelasDipilih" :key="j.id">
              <button
                type="button"
                class="w-full text-left rounded-lg border border-outline-variant p-3 hover:border-primary transition flex gap-3"
                @click="buka('dosen-kelas-kuliah-detail', { id: j.id })"
              >
                <span class="material-symbols-outlined text-primary bg-primary-container/60 rounded-lg p-2 self-start" style="font-size: 20px">event_note</span>
                <span class="min-w-0">
                  <span class="block font-semibold text-on-surface">{{ j.namaMataKuliah }}</span>
                  <span class="block text-label-sm text-on-surface-variant">{{ j.kodeMataKuliah }} · Kelas {{ j.kelas }}</span>
                  <span class="block text-label-sm text-on-surface-variant">
                    {{ j.jam ? `Jam ke-${j.jam}` : 'Jam belum diatur' }}{{ j.ruangan ? ` · ${j.ruangan}` : '' }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </section>

      <!-- Tugas Belum Dikumpulkan -->
      <section class="rounded-xl border border-outline-variant overflow-hidden flex flex-col">
        <div class="px-4 py-4 border-b border-outline-variant">
          <h3 class="text-headline-sm font-semibold text-on-surface">Tugas Belum Dikumpulkan</h3>
          <p class="text-label-sm text-on-surface-variant">Kuis &amp; tugas e-learning yang masih ada mahasiswa belum mengerjakan / mengumpulkan.</p>
        </div>
        <div class="p-4 flex-1">
          <p v-if="!data.tugas.length" class="text-body-sm text-on-surface-variant">Tidak ada tugas.</p>
          <ul v-else class="space-y-2.5 max-h-80 overflow-y-auto">
            <li v-for="t in data.tugas" :key="t.id">
              <button
                type="button"
                class="w-full text-left rounded-lg border border-outline-variant p-3 hover:border-primary transition"
                @click="t.jenis === 'TUGAS' ? buka('dosen-elearning-kelas', { id: t.jadwalKuliahId }) : buka('dosen-laporan-elearning', undefined, { kelas: String(t.jadwalKuliahId), tab: 'kuis' })"
              >
                <span class="flex items-center gap-2">
                  <span
                    class="material-symbols-outlined rounded-md p-1"
                    :class="t.jenis === 'TUGAS' ? 'text-[#0e7490] bg-[#0891b2]/10' : 'text-[#5b21b6] bg-[#7c3aed]/10'"
                    style="font-size: 18px"
                    >{{ t.jenis === 'TUGAS' ? 'assignment' : 'quiz' }}</span
                  >
                  <span class="font-semibold text-on-surface line-clamp-1">{{ t.judul }}</span>
                  <span v-if="t.isWajib" class="ml-auto px-1.5 py-0.5 rounded text-label-sm bg-[#d83b3b] text-white font-semibold">Wajib</span>
                </span>
                <span class="block mt-1 text-label-sm text-on-surface-variant">{{ t.kodeMataKuliah }} · Kelas {{ t.kelas }}</span>
                <span class="mt-2 flex items-center gap-2">
                  <span class="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <span class="block h-full rounded-full bg-primary" :style="{ width: `${t.penerima ? (t.sudah / t.penerima) * 100 : 0}%` }" />
                  </span>
                  <span class="text-label-sm whitespace-nowrap"><strong>{{ t.belum }}</strong> belum · {{ t.sudah }}/{{ t.penerima }}</span>
                </span>
                <span v-if="t.tenggat" class="block mt-1 text-label-sm" :class="t.lewat ? 'text-error' : 'text-[#b4690e]'">
                  {{ t.lewat ? 'Batas waktu lewat' : 'Batas' }}: {{ formatDateTime(t.tenggat) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </section>
    </div>
    <template #footer>
      <AppButton variant="secondary" icon="cast_for_education" @click="buka('dosen-elearning')">Buka E-learning</AppButton>
      <AppButton @click="open = false">Tutup</AppButton>
    </template>
  </Modal>
</template>
