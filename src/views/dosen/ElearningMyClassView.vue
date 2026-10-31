<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import { dosenElearningApi, type ElearningKelas } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { dosenTahunAkademikStorage } from '@/api/dosenHttp';
import { formatDateTime } from '@/utils/format';

/** Target pertemuan per semester (sama dengan rekap kehadiran: 16 pertemuan). */
const TARGET_PERTEMUAN = 16;
const HARI: Record<string, string> = { SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: "Jum'at", SABTU: 'Sabtu', MINGGU: 'Minggu' };
const jadwalTeks = (k: ElearningKelas) => {
  const hari = (k.hari ?? []).map((h) => HARI[h] ?? h).join(', ');
  if (!hari && !k.jam) return 'Jadwal belum ditentukan';
  return [hari, k.jam ? `Jam ke-${k.jam}` : null].filter(Boolean).join(' · ');
};

/** E-learning → My Class: kelas yang diampu dosen (tahun akademik terpilih); klik kartu untuk kelola konten kelas. */
const kelas = ref<ElearningKelas[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const cari = ref('');
const tahunAkademik = dosenTahunAkademikStorage.get();

onMounted(async () => {
  loading.value = true;
  try {
    kelas.value = await dosenElearningApi.kelas();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  } finally {
    loading.value = false;
  }
});
const tampil = computed(() => {
  const q = cari.value.trim().toLowerCase();
  return q ? kelas.value.filter((k) => [k.namaMataKuliah, k.kodeMataKuliah, k.kelas].some((v) => v.toLowerCase().includes(q))) : kelas.value;
});
</script>

<template>
  <div>
    <PageHeader title="My Class" :subtitle="`Kelas yang Anda ampu${tahunAkademik ? ` — TA ${tahunAkademik.label}` : ''}. Pilih kelas untuk mengelola materi, video, dan kuis.`" />
    <ElearningShell>
      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat kelas...</div>
      <div v-else-if="!kelas.length" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
        Anda belum mengampu kelas pada tahun akademik ini.
      </div>
      <template v-else>
        <div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p class="text-body-sm text-on-surface-variant">{{ kelas.length }} kelas</p>
          <input
            v-if="kelas.length > 3"
            v-model="cari"
            class="sm:ml-auto w-full sm:w-80 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
            placeholder="Cari mata kuliah, kode, atau kelas..."
          />
        </div>
        <p v-if="!tampil.length" class="p-6 text-center text-body-sm text-on-surface-variant">Tidak ada kelas yang cocok.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <RouterLink
            v-for="k in tampil"
            :key="k.id"
            :to="{ name: 'dosen-elearning-kelas', params: { id: k.id } }"
            class="group rounded-lg border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary hover:shadow-sm transition"
          >
            <div class="flex items-start gap-3">
              <MataKuliahIlustrasi :nama="k.namaMataKuliah" :kode="k.kodeMataKuliah" :ikon="k.ikon" />
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-on-surface group-hover:text-primary">{{ k.namaMataKuliah }}</p>
                <p class="text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.sks ?? '-' }} SKS · {{ k.peserta }} mahasiswa</p>
                <div class="mt-1.5 flex flex-wrap gap-1.5 text-label-sm">
                  <span v-if="k.peran" class="px-2 py-0.5 rounded-full" :class="k.peran === 'KOORDINATOR' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'">
                    {{ k.peran === 'KOORDINATOR' ? 'Koordinator' : 'Pengampu' }}
                  </span>
                  <span v-if="k.semester" class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Semester {{ k.semester }}</span>
                  <span v-if="k.kelompok" class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{{ k.kelompok === 'WAJIB' ? 'Wajib' : 'Pilihan' }}</span>
                  <span v-if="k.isObe" class="px-2 py-0.5 rounded-full border border-[#2563eb]/40 bg-[#2563eb]/10 text-[#1e40af]">OBE</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary">chevron_right</span>
            </div>

            <!-- Detail kelas -->
            <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-label-md">
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-primary" style="font-size: 18px">calendar_month</span>
                <dt class="sr-only">Jadwal</dt>
                <dd class="truncate text-on-surface">{{ jadwalTeks(k) }}</dd>
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-primary" style="font-size: 18px">{{ k.ruangan ? 'meeting_room' : 'location_off' }}</span>
                <dt class="sr-only">Ruangan</dt>
                <dd class="truncate" :class="k.ruangan ? 'text-on-surface' : 'text-on-surface-variant'">{{ k.ruangan ? `Ruang ${k.ruangan}` : 'Ruang belum ditentukan' }}</dd>
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-primary" style="font-size: 18px">history</span>
                <dt class="sr-only">Konten terakhir</dt>
                <dd class="truncate text-on-surface-variant">{{ k.kontenTerakhir ? `Konten diperbarui ${formatDateTime(k.kontenTerakhir)}` : 'Belum ada konten' }}</dd>
              </div>
              <div v-if="k.tugasBelumDinilai" class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-[#b45309]" style="font-size: 18px">pending_actions</span>
                <dt class="sr-only">Tugas belum dinilai</dt>
                <dd class="truncate font-medium text-[#7a5200]">{{ k.tugasBelumDinilai }} tugas belum dinilai</dd>
              </div>
              <div v-else-if="k.linkKelas" class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-primary" style="font-size: 18px">link</span>
                <dt class="sr-only">Kelas daring</dt>
                <dd class="truncate text-on-surface-variant">Ada link kelas daring</dd>
              </div>
            </dl>

            <!-- Progres pertemuan -->
            <div class="mt-3">
              <div class="flex justify-between text-label-sm text-on-surface-variant mb-1">
                <span>Pertemuan terlaksana</span>
                <span class="font-semibold text-on-surface">{{ k.pertemuan ?? 0 }} / {{ TARGET_PERTEMUAN }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${Math.min(100, ((k.pertemuan ?? 0) / TARGET_PERTEMUAN) * 100)}%` }" />
              </div>
            </div>

            <div class="mt-4 grid grid-cols-4 gap-2 text-center text-label-sm">
              <div class="rounded-md bg-surface-container py-2">
                <p class="text-headline-sm font-semibold text-on-surface">{{ k.jumlah.materi }}</p>
                Materi
              </div>
              <div class="rounded-md bg-surface-container py-2">
                <p class="text-headline-sm font-semibold text-on-surface">{{ k.jumlah.video }}</p>
                Video
              </div>
              <div class="rounded-md bg-surface-container py-2">
                <p class="text-headline-sm font-semibold text-on-surface">{{ k.jumlah.kuis }}</p>
                Kuis
              </div>
              <div class="rounded-md bg-surface-container py-2">
                <p class="text-headline-sm font-semibold text-on-surface">{{ k.jumlah.tugas ?? 0 }}</p>
                Tugas
              </div>
            </div>
          </RouterLink>
        </div>
      </template>
    </ElearningShell>
  </div>
</template>
