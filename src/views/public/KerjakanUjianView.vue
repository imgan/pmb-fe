<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import { pesertaAuthApi, type LembarUjian } from '@/api/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

/**
 * Pengerjaan tes seleksi PMB (soal dari LMS Bank Ujian). Jawaban tersimpan otomatis per soal; saat waktu habis jawaban
 * dikirim otomatis. PG dinilai otomatis, essay dikoreksi panitia.
 */
const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);
const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

const lembar = ref<LembarUjian | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const pilihan = reactive<Record<number, number | null>>({});
const teks = reactive<Record<number, string>>({});
const status = reactive<Record<number, 'menyimpan' | 'tersimpan' | 'gagal'>>({});
const mengirim = ref(false);

// Hitung mundur memakai selisih jam server agar tidak bergantung pada jam perangkat peserta.
const selisihJam = ref(0);
const sisaMs = ref<number | null>(null);
let tick: ReturnType<typeof setInterval> | undefined;

const sisaTeks = computed(() => {
  if (sisaMs.value === null) return null;
  const total = Math.max(0, Math.floor(sisaMs.value / 1000));
  const j = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const d = total % 60;
  return `${j ? `${j}:` : ''}${String(m).padStart(2, '0')}:${String(d).padStart(2, '0')}`;
});

const terjawab = (soalId: number) => {
  const s = lembar.value?.soal.find((x) => x.id === soalId);
  return s?.tipe === 'PG' ? pilihan[soalId] !== null && pilihan[soalId] !== undefined : !!teks[soalId]?.trim();
};
const jumlahTerjawab = computed(() => lembar.value?.soal.filter((s) => terjawab(s.id)).length ?? 0);

onMounted(async () => {
  try {
    const l = await pesertaAuthApi.mulaiTesUjian(id);
    lembar.value = l;
    l.soal.forEach((s) => {
      pilihan[s.id] = l.jawaban[s.id]?.pilihan ?? null;
      teks[s.id] = l.jawaban[s.id]?.teks ?? '';
    });
    selisihJam.value = new Date(l.sekarang).getTime() - Date.now();
    if (l.batasAt) {
      const batas = new Date(l.batasAt).getTime();
      const update = () => {
        sisaMs.value = batas - (Date.now() + selisihJam.value);
        if (sisaMs.value <= 0) {
          clearInterval(tick);
          kirim(true);
        }
      };
      update();
      tick = setInterval(update, 1000);
    }
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membuka ujian');
  } finally {
    loading.value = false;
  }
});

const timers: Record<number, ReturnType<typeof setTimeout>> = {};
onBeforeUnmount(() => {
  clearInterval(tick);
  Object.values(timers).forEach(clearTimeout);
});

const simpan = async (soalId: number) => {
  const s = lembar.value?.soal.find((x) => x.id === soalId);
  if (!s) return;
  status[soalId] = 'menyimpan';
  try {
    await pesertaAuthApi.simpanJawabanUjian(id, s.tipe === 'PG' ? { soalId, pilihan: pilihan[soalId] } : { soalId, teks: teks[soalId] });
    status[soalId] = 'tersimpan';
  } catch {
    status[soalId] = 'gagal';
  }
};
const pilih = (soalId: number, i: number) => {
  pilihan[soalId] = i;
  simpan(soalId);
};
// Essay: simpan 1 detik setelah berhenti mengetik.
const ketik = (soalId: number) => {
  clearTimeout(timers[soalId]);
  timers[soalId] = setTimeout(() => simpan(soalId), 1000);
};

const kirim = async (otomatis = false) => {
  if (mengirim.value || !lembar.value) return;
  if (!otomatis) {
    const kosong = lembar.value.soal.length - jumlahTerjawab.value;
    const ok = await confirmAction({
      title: 'Kirim jawaban?',
      text: kosong ? `Masih ada ${kosong} soal yang belum dijawab. Jawaban tidak bisa diubah setelah dikirim.` : 'Jawaban tidak bisa diubah setelah dikirim.',
      confirmLabel: 'Kirim',
    });
    if (!ok) return;
  }
  mengirim.value = true;
  try {
    // Pastikan jawaban essay yang masih menunggu ikut tersimpan.
    const tertunda = Object.keys(timers).map(Number);
    tertunda.forEach((k) => clearTimeout(timers[k]));
    await Promise.all(tertunda.map((k) => simpan(k)));
    await pesertaAuthApi.kirimTesUjian(id);
    toastSuccess(otomatis ? 'Waktu habis — jawaban dikirim otomatis' : 'Jawaban ujian terkirim');
    router.replace({ name: 'pendaftaran-tes-ujian' });
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengirim jawaban'));
    mengirim.value = false;
  }
};

const keSoal = (soalId: number) => document.getElementById(`soal-${soalId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <div class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-12 py-8 md:py-12">
      <p v-if="loading" class="py-20 text-center text-body-md text-on-surface-variant">Membuka ujian...</p>

      <div v-else-if="error" class="max-w-lg mx-auto text-center py-16 space-y-4">
        <span class="material-symbols-outlined text-error" style="font-size: 48px">error</span>
        <p class="text-body-lg font-semibold text-on-surface">{{ error }}</p>
        <RouterLink :to="{ name: 'pendaftaran-tes-ujian' }" class="inline-block px-5 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-semibold">
          Kembali ke Tes Ujian
        </RouterLink>
      </div>

      <div v-else-if="lembar" class="grid md:grid-cols-[minmax(0,1fr)_15rem] gap-6 items-start">
        <main class="space-y-4 min-w-0">
          <div>
            <h1 class="text-headline-md font-semibold text-primary">{{ lembar.namaUjian }}</h1>
            <p class="text-body-sm text-on-surface-variant">{{ lembar.judul }} · {{ lembar.soal.length }} soal</p>
          </div>

          <div v-for="(s, i) in lembar.soal" :id="`soal-${s.id}`" :key="s.id" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 scroll-mt-28">
            <div class="flex items-start justify-between gap-3 mb-3">
              <p class="text-body-md text-on-surface whitespace-pre-line"><span class="font-semibold">{{ i + 1 }}.</span> {{ s.pertanyaan }}</p>
              <span class="shrink-0 text-label-sm" :class="status[s.id] === 'gagal' ? 'text-error' : 'text-on-surface-variant'">
                {{ status[s.id] === 'menyimpan' ? 'Menyimpan...' : status[s.id] === 'tersimpan' ? 'Tersimpan' : status[s.id] === 'gagal' ? 'Gagal menyimpan' : '' }}
              </span>
            </div>
            <div v-if="s.tipe === 'PG'" class="space-y-2">
              <button
                v-for="(p, pi) in s.pilihan"
                :key="pi"
                type="button"
                :disabled="mengirim"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-body-sm transition-colors"
                :class="pilihan[s.id] === pi ? 'border-primary bg-primary/10 text-on-surface' : 'border-outline-variant hover:bg-surface-container-low'"
                @click="pilih(s.id, pi)"
              >
                <span
                  class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-label-md font-semibold"
                  :class="pilihan[s.id] === pi ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'"
                >
                  {{ HURUF[pi] }}
                </span>
                {{ p }}
              </button>
            </div>
            <textarea
              v-else
              v-model="teks[s.id]"
              rows="5"
              :disabled="mengirim"
              placeholder="Tulis jawaban Anda..."
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary resize-y"
              @input="ketik(s.id)"
              @blur="simpan(s.id)"
            />
          </div>
        </main>

        <aside class="md:sticky md:top-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-4">
          <div v-if="sisaTeks !== null" class="text-center">
            <p class="text-label-sm text-on-surface-variant">Sisa waktu</p>
            <p class="text-headline-md font-bold tabular-nums" :class="(sisaMs ?? 0) < 5 * 60000 ? 'text-error' : 'text-on-surface'">{{ sisaTeks }}</p>
          </div>
          <p v-else class="text-center text-label-sm text-on-surface-variant">Tanpa batas waktu</p>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-2">Terjawab {{ jumlahTerjawab }}/{{ lembar.soal.length }}</p>
            <div class="grid grid-cols-6 md:grid-cols-5 gap-1.5">
              <button
                v-for="(s, i) in lembar.soal"
                :key="s.id"
                type="button"
                class="h-8 rounded text-label-sm font-semibold"
                :class="terjawab(s.id) ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                @click="keSoal(s.id)"
              >
                {{ i + 1 }}
              </button>
            </div>
          </div>
          <button
            type="button"
            :disabled="mengirim"
            class="w-full px-4 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 disabled:opacity-50"
            @click="kirim()"
          >
            {{ mengirim ? 'Mengirim...' : 'Kirim Jawaban' }}
          </button>
          <p class="text-[11px] text-on-surface-variant">Jawaban tersimpan otomatis. Anda bisa menutup halaman & melanjutkan nanti selama waktu masih ada.</p>
        </aside>
      </div>
    </div>

    <PublicFooter />
  </div>
</template>
