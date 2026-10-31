<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { mahasiswaAngketDosenApi, type AngketDosenMahasiswa } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Akademik → Angket Dosen: penilaian setiap dosen pengajar pada kelas di KRS yang sudah disetujui
 * (tahun akademik aktif). Satu angket per dosen per kelas; setelah dikirim tidak bisa diubah.
 * Pertanyaan & pilihan jawaban diatur prodi (Pertanyaan Angket Dosen).
 */
type Kelas = AngketDosenMahasiswa['kelas'][number];
type DosenKelas = Kelas['dosen'][number];

const data = ref<AngketDosenMahasiswa | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const muat = async () => {
  try {
    data.value = await mahasiswaAngketDosenApi.get();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat angket dosen');
  } finally {
    loading.value = false;
  }
};
// Dari KHS (?jadwal=ID): sorot kelas tsb & langsung buka form dosen pertama yang belum dinilai.
const route = useRoute();
const sorotJadwal = ref<number | null>(Number(route.query.jadwal) || null);
onMounted(async () => {
  await muat();
  const k = data.value?.kelas.find((x) => x.jadwalKuliahId === sorotJadwal.value);
  if (!k) return;
  await nextTick();
  document.getElementById(`kelas-${k.jadwalKuliahId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const d = k.dosen.find((x) => !x.sudahDiisi);
  if (d && data.value?.pertanyaan.length) bukaForm(k, d);
});

const persen = computed(() => (data.value?.ringkasan.total ? Math.round((data.value.ringkasan.sudah / data.value.ringkasan.total) * 100) : 0));

// ---- Form isi angket ----
const formOpen = ref(false);
const target = ref<{ kelas: Kelas; dosen: DosenKelas } | null>(null);
const nilai = reactive<Record<number, number | null>>({});
const teks = reactive<Record<number, string>>({});
const saran = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);

const bukaForm = (kelas: Kelas, dosen: DosenKelas) => {
  target.value = { kelas, dosen };
  (data.value?.pertanyaan ?? []).forEach((p) => {
    nilai[p.id] = null;
    teks[p.id] = '';
  });
  saran.value = '';
  formError.value = null;
  formOpen.value = true;
};

const belumDijawab = computed(() =>
  (data.value?.pertanyaan ?? []).filter((p) => !p.openQuestion && (nilai[p.id] === null || nilai[p.id] === undefined)).length
);

const kirim = async () => {
  if (!target.value || !data.value) return;
  formError.value = null;
  const kosong = data.value.pertanyaan.findIndex((p) => !p.openQuestion && (nilai[p.id] === null || nilai[p.id] === undefined));
  if (kosong >= 0) {
    formError.value = `Pertanyaan nomor ${kosong + 1} belum dijawab`;
    document.getElementById(`pertanyaan-${data.value.pertanyaan[kosong].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  saving.value = true;
  try {
    const pesan = await mahasiswaAngketDosenApi.submit({
      jadwalKuliahId: target.value.kelas.jadwalKuliahId,
      dosenId: target.value.dosen.dosenId,
      jawaban: data.value.pertanyaan.map((p) => (p.openQuestion ? { pertanyaanId: p.id, teks: teks[p.id] || null } : { pertanyaanId: p.id, nilai: nilai[p.id] })),
      saran: saran.value.trim() || null,
    });
    toastSuccess(pesan);
    formOpen.value = false;
    await muat();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal mengirim angket');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Angket Dosen</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Nilai setiap dosen pengajar pada mata kuliah yang Anda ambil semester ini. Jawaban Anda bersifat rahasia dan membantu peningkatan mutu perkuliahan.
      </p>
    </header>

    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat angket...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <template v-else-if="data">
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center gap-4">
        <div class="flex-1">
          <p class="text-label-md text-on-surface-variant">Tahun Akademik {{ data.tahunAjaran ?? '-' }}</p>
          <p class="text-title-md font-semibold text-on-surface">
            {{ data.ringkasan.sudah }} dari {{ data.ringkasan.total }} dosen sudah dinilai
          </p>
        </div>
        <div class="w-full md:w-72">
          <div class="h-2.5 rounded-full bg-surface-container overflow-hidden">
            <div class="h-full bg-[#059669] transition-all" :style="{ width: `${persen}%` }"></div>
          </div>
          <p class="mt-1 text-right text-label-sm text-on-surface-variant tabular-nums">{{ persen }}%</p>
        </div>
      </section>

      <div
        v-if="!data.kelas.length"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center text-body-md text-on-surface-variant"
      >
        Belum ada mata kuliah untuk dinilai. Angket dosen tersedia setelah KRS Anda disetujui dosen PA/BAAK.
      </div>

      <div v-else class="space-y-4">
        <article
          v-for="k in data.kelas"
          :id="`kelas-${k.jadwalKuliahId}`"
          :key="k.jadwalKuliahId"
          class="bg-surface-container-lowest border rounded-lg overflow-hidden scroll-mt-4"
          :class="sorotJadwal === k.jadwalKuliahId ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant'"
        >
          <div class="px-4 py-3 border-b border-outline-variant flex flex-wrap items-center gap-x-4 gap-y-1 bg-surface-bright">
            <div class="flex-1 min-w-0">
              <h2 class="font-semibold text-title-md text-on-surface">{{ k.namaMataKuliah }}</h2>
              <p class="text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.sks ?? 0 }} SKS</p>
            </div>
            <span class="inline-flex items-center gap-1 text-label-md text-on-surface-variant" title="Kehadiran Anda di kelas ini">
              <span class="material-symbols-outlined" style="font-size: 18px">fact_check</span>
              Hadir <strong class="text-on-surface tabular-nums">{{ k.kehadiran.hadir }}/{{ k.kehadiran.pertemuan }}</strong> pertemuan
            </span>
          </div>
          <ul class="divide-y divide-outline-variant">
            <li v-for="d in k.dosen" :key="d.dosenId" class="px-4 py-3 flex flex-wrap items-center gap-3">
              <span class="material-symbols-outlined text-primary" style="font-size: 28px">account_circle</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-on-surface">{{ d.nama }}</p>
                <p class="text-label-sm text-on-surface-variant">
                  {{ d.nidn ?? '-' }}<template v-if="d.penanggungJawab"> · Penanggung Jawab</template>
                </p>
              </div>
              <span
                v-if="d.sudahDiisi"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#059669]/10 text-[#059669] text-label-md font-medium"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
                Sudah dinilai<template v-if="d.diisiPada"> · {{ formatDate(d.diisiPada) }}</template>
              </span>
              <AppButton v-else icon="rate_review" @click="bukaForm(k, d)">Isi Angket</AppButton>
            </li>
            <li v-if="!k.dosen.length" class="px-4 py-3 text-body-sm text-on-surface-variant">Tidak ada dosen yang dinilai di kelas ini.</li>
          </ul>
        </article>
      </div>
    </template>

    <Modal
      v-model="formOpen"
      title="Isi Angket Dosen"
      :subtitle="target ? `${target.dosen.nama} · ${target.kelas.namaMataKuliah} (${target.kelas.kelas})` : ''"
      size="lg"
    >
      <div v-if="data" class="space-y-4">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <p v-if="!data.pertanyaan.length" class="px-3 py-2 rounded-md bg-surface-container text-body-sm text-on-surface">
          Pertanyaan angket untuk periode ini belum diatur prodi. Silakan coba lagi nanti.
        </p>
        <p v-else class="text-body-sm text-on-surface-variant">
          Pilih jawaban yang paling sesuai untuk setiap pertanyaan. Angket hanya bisa diisi <strong>satu kali</strong> dan tidak bisa
          diubah setelah dikirim. Nilai mata kuliah di KHS tampil setelah semua dosennya dinilai.
        </p>
        <fieldset
          v-for="(p, i) in data.pertanyaan"
          :id="`pertanyaan-${p.id}`"
          :key="p.id"
          class="border border-outline-variant rounded-md p-4 scroll-mt-4"
        >
          <legend class="sr-only">Pertanyaan {{ i + 1 }}</legend>
          <p v-if="p.kategori" class="text-label-sm font-medium text-primary mb-1">{{ p.kategori }}</p>
          <p class="text-body-md text-on-surface mb-3">
            <span class="font-semibold">{{ i + 1 }}.</span> {{ p.pertanyaan }}
            <span v-if="!p.openQuestion" class="text-error">*</span>
          </p>
          <textarea
            v-if="p.openQuestion"
            v-model="teks[p.id]"
            rows="3"
            maxlength="2000"
            placeholder="Tulis jawaban Anda (opsional)"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          ></textarea>
          <div v-else class="flex flex-wrap gap-2">
            <label
              v-for="o in data.pilihanJawaban"
              :key="o.id"
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-body-sm transition-colors"
              :class="nilai[p.id] === o.nilai ? 'border-primary bg-primary/10 text-on-surface font-medium' : 'border-outline-variant hover:border-primary'"
            >
              <input v-model="nilai[p.id]" type="radio" :name="`p-${p.id}`" :value="o.nilai" class="accent-primary" />
              {{ o.jawaban }}
            </label>
          </div>
        </fieldset>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-1">Saran untuk dosen (opsional)</span>
          <textarea
            v-model="saran"
            rows="3"
            maxlength="2000"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          ></textarea>
        </label>
      </div>
      <template #footer>
        <span v-if="belumDijawab" class="mr-auto text-label-md text-on-surface-variant">{{ belumDijawab }} pertanyaan belum dijawab</span>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton icon="send" :disabled="saving || !data?.pertanyaan.length" @click="kirim">{{ saving ? 'Mengirim...' : 'Kirim Angket' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>
