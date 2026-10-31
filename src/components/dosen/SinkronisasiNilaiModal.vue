<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenElearningApi, type SumberNilaiKelas } from '@/api/elearning';
import type { KomponenNilai } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { toastError } from '@/utils/swal';

/**
 * Sinkronisasi Input Nilai (kelas non-OBE): tampilkan dulu seluruh nilai e-learning (kuis & tugas) dan kehadiran
 * tiap mahasiswa, lalu dosen memilih sumber tiap komponen — Manual (tidak diubah), Kehadiran (% hadir), atau
 * E-learning (wajib memilih kuis / tugas yang dihitung; nilai = rata-rata item terpilih). Hasil hanya mengisi form;
 * nilai tersimpan setelah dosen menekan Simpan Nilai.
 */
type Sumber = 'MANUAL' | 'KEHADIRAN' | 'ELEARNING';
interface Aturan {
  sumber: Sumber;
  item: number[];
  /** Item yang belum dikerjakan / belum dinilai: dihitung 0, atau dilewati (rata-rata dari yang ada). */
  kosong: 'nol' | 'lewati';
}

const props = defineProps<{
  jadwalKuliahId: number;
  komponen: { key: KomponenNilai; label: string; bobot: number }[];
  mahasiswa: { mahasiswaId: number; nim: string; namaLengkap: string; input: Record<KomponenNilai, string> }[];
}>();
const emit = defineEmits<{ terapkan: [hasil: Record<number, Partial<Record<KomponenNilai, number>>>] }>();
const open = defineModel<boolean>({ default: false });

const data = ref<SumberNilaiKelas | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const izinSakitHadir = ref(false);
const aturan = reactive<Record<string, Aturan>>({});
const kunciSimpan = computed(() => `sinkron-nilai:${props.jadwalKuliahId}`);

const aturanAwal = (key: KomponenNilai): Aturan => ({ sumber: key === 'partisipatif' ? 'KEHADIRAN' : 'MANUAL', item: [], kosong: 'nol' });

watch(open, async (o) => {
  if (!o) return;
  loading.value = true;
  error.value = null;
  try {
    data.value = await dosenElearningApi.sumberNilai(props.jadwalKuliahId);
    // Pilihan terakhir untuk kelas ini (per browser) — item yang sudah tidak ada dibuang.
    let tersimpan: { izinSakitHadir?: boolean; aturan?: Record<string, Aturan> } = {};
    try {
      tersimpan = JSON.parse(localStorage.getItem(kunciSimpan.value) ?? '{}');
    } catch {
      tersimpan = {};
    }
    const ada = new Set(data.value.item.map((i) => i.id));
    izinSakitHadir.value = !!tersimpan.izinSakitHadir;
    props.komponen.forEach(({ key }) => {
      const t = tersimpan.aturan?.[key];
      aturan[key] = t ? { ...aturanAwal(key), ...t, item: (t.item ?? []).filter((id) => ada.has(id)) } : aturanAwal(key);
      if (aturan[key].sumber === 'KEHADIRAN' && !data.value?.jumlahPertemuan) aturan[key].sumber = 'MANUAL';
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat nilai e-learning & kehadiran');
  } finally {
    loading.value = false;
  }
});

const kehadiranOf = computed(() => new Map((data.value?.kehadiran ?? []).map((k) => [k.mahasiswaId, k])));
const persenHadir = (mahasiswaId: number) => {
  const n = data.value?.jumlahPertemuan ?? 0;
  const k = kehadiranOf.value.get(mahasiswaId);
  if (!n || !k) return null;
  return Math.round(((k.hadir + (izinSakitHadir.value ? k.izin + k.sakit : 0)) / n) * 10000) / 100;
};
/** Item dipakai komponen lain (agar satu kuis / tugas tidak terhitung dua kali). */
const dipakaiOleh = (itemId: number, key: KomponenNilai) =>
  props.komponen.find((k) => k.key !== key && aturan[k.key]?.sumber === 'ELEARNING' && aturan[k.key].item.includes(itemId))?.label ?? null;
const pilihJenis = (key: KomponenNilai, jenis: 'KUIS' | 'TUGAS') => {
  const ids = (data.value?.item ?? []).filter((i) => i.jenis === jenis && !dipakaiOleh(i.id, key)).map((i) => i.id);
  aturan[key].item = [...new Set([...aturan[key].item, ...ids])];
};

const bulat = (v: number) => Math.round(v * 100) / 100;
/** Nilai baru satu komponen untuk satu mahasiswa; null = tidak diubah. */
const hitung = (mahasiswaId: number, key: KomponenNilai): number | null => {
  const a = aturan[key];
  if (!a || a.sumber === 'MANUAL') return null;
  if (a.sumber === 'KEHADIRAN') return persenHadir(mahasiswaId);
  const nilai = data.value?.nilai[mahasiswaId] ?? {};
  const list = a.item.map((id) => nilai[id]).filter((x) => x !== undefined); // bukan penerima → tidak dihitung
  const angka = a.kosong === 'nol' ? list.map((x) => x!.nilai ?? 0) : list.filter((x) => x!.nilai !== null).map((x) => x!.nilai as number);
  return angka.length ? bulat(angka.reduce((s, v) => s + v, 0) / angka.length) : null;
};

const komponenAktif = computed(() => props.komponen.filter((k) => aturan[k.key] && aturan[k.key].sumber !== 'MANUAL'));
const kurangItem = computed(() => props.komponen.filter((k) => aturan[k.key]?.sumber === 'ELEARNING' && !aturan[k.key].item.length));

const terapkan = () => {
  if (kurangItem.value.length) return toastError(`Pilih minimal satu kuis / tugas e-learning untuk: ${kurangItem.value.map((k) => k.label).join(', ')}`);
  if (!komponenAktif.value.length) return toastError('Pilih sumber nilai (Kehadiran / E-learning) minimal untuk satu komponen');
  const hasil: Record<number, Partial<Record<KomponenNilai, number>>> = {};
  props.mahasiswa.forEach((m) => {
    komponenAktif.value.forEach(({ key }) => {
      const v = hitung(m.mahasiswaId, key);
      if (v !== null) (hasil[m.mahasiswaId] ??= {})[key] = v;
    });
  });
  try {
    localStorage.setItem(kunciSimpan.value, JSON.stringify({ izinSakitHadir: izinSakitHadir.value, aturan }));
  } catch {
    /* penyimpanan browser tidak tersedia — abaikan */
  }
  emit('terapkan', hasil);
  open.value = false;
};

const JENIS = { KUIS: { label: 'Kuis', cls: 'bg-[#7c3aed]/10 text-[#5b21b6]' }, TUGAS: { label: 'Tugas', cls: 'bg-[#0891b2]/10 text-[#0e7490]' } } as const;
const tampilNilai = (mahasiswaId: number, itemId: number) => {
  const x = data.value?.nilai[mahasiswaId]?.[itemId];
  if (!x) return { teks: '', cls: '' };
  if (x.status === 'SELESAI') return { teks: String(x.nilai), cls: 'font-medium text-on-surface' };
  if (x.status === 'BELUM_DINILAI') return { teks: 'blm dinilai', cls: 'text-[#7a5200] text-label-sm' };
  return { teks: 'belum', cls: 'text-on-surface-variant text-label-sm' };
};
</script>

<template>
  <Modal v-model="open" title="Sinkronisasi Nilai" subtitle="Ambil nilai dari kehadiran & e-learning, lalu periksa sebelum disimpan." size="2xl">
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat nilai e-learning & kehadiran...</div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-else-if="data" class="space-y-5">
      <!-- 1. Seluruh nilai -->
      <section>
        <h4 class="text-label-lg font-semibold text-on-surface mb-1">1. Nilai di E-learning & Kehadiran</h4>
        <p class="text-label-sm text-on-surface-variant mb-2">
          {{ data.item.length }} kuis/tugas terbit · {{ data.jumlahPertemuan }} pertemuan terealisasi. Sel kosong = mahasiswa bukan penerima konten tersebut.
        </p>
        <div class="max-h-72 overflow-auto border border-outline-variant rounded-lg">
          <table class="w-full text-body-sm border-collapse">
            <thead class="sticky top-0 bg-surface-container text-label-md text-on-surface-variant z-10">
              <tr>
                <th class="p-2 text-left">NIM</th>
                <th class="p-2 text-left min-w-44">Nama</th>
                <th class="p-2 text-center whitespace-nowrap">Kehadiran</th>
                <th v-for="i in data.item" :key="i.id" class="p-2 text-center min-w-28 align-bottom">
                  <span class="inline-block px-1.5 rounded text-label-sm" :class="JENIS[i.jenis].cls">{{ JENIS[i.jenis].label }}</span>
                  <span class="block font-medium text-on-surface leading-tight mt-0.5 line-clamp-2" :title="i.judul">{{ i.judul }}</span>
                  <span v-if="i.pertemuanKe" class="block text-label-sm font-normal">P{{ i.pertemuanKe }}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-for="m in mahasiswa" :key="m.mahasiswaId">
                <td class="p-2 whitespace-nowrap text-on-surface-variant">{{ m.nim }}</td>
                <td class="p-2">{{ m.namaLengkap }}</td>
                <td class="p-2 text-center whitespace-nowrap">
                  <template v-if="kehadiranOf.get(m.mahasiswaId)">
                    <span class="font-medium">{{ persenHadir(m.mahasiswaId) ?? '-' }}%</span>
                    <span class="block text-label-sm text-on-surface-variant">
                      H{{ kehadiranOf.get(m.mahasiswaId)!.hadir }} I{{ kehadiranOf.get(m.mahasiswaId)!.izin }} S{{ kehadiranOf.get(m.mahasiswaId)!.sakit }} A{{ kehadiranOf.get(m.mahasiswaId)!.alpa }}
                    </span>
                  </template>
                  <span v-else class="text-on-surface-variant">-</span>
                </td>
                <td v-for="i in data.item" :key="i.id" class="p-2 text-center tabular-nums" :class="tampilNilai(m.mahasiswaId, i.id).cls">
                  {{ tampilNilai(m.mahasiswaId, i.id).teks }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!data.item.length" class="mt-2 text-label-sm text-[#7a5200]">Belum ada kuis / tugas terbit di e-learning kelas ini — sumber E-learning belum bisa dipakai.</p>
      </section>

      <!-- 2. Sumber per komponen -->
      <section>
        <h4 class="text-label-lg font-semibold text-on-surface mb-2">2. Pilih Sumber Nilai Tiap Komponen</h4>
        <div class="grid gap-3 lg:grid-cols-2">
          <div
            v-for="k in komponen"
            :key="k.key"
            class="rounded-lg border p-3"
            :class="aturan[k.key]?.sumber === 'ELEARNING' && !aturan[k.key].item.length ? 'border-error' : 'border-outline-variant'"
          >
            <p class="font-semibold text-on-surface mb-2">
              {{ k.label }} <span class="text-label-sm font-normal text-on-surface-variant">· bobot {{ Math.round(k.bobot * 10000) / 100 }}%</span>
            </p>
            <div v-if="aturan[k.key]" class="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input v-model="aturan[k.key].sumber" type="radio" value="MANUAL" class="accent-primary" /> Input manual
              </label>
              <label class="inline-flex items-center gap-1.5" :class="data.jumlahPertemuan ? 'cursor-pointer' : 'opacity-50'">
                <input v-model="aturan[k.key].sumber" type="radio" value="KEHADIRAN" class="accent-primary" :disabled="!data.jumlahPertemuan" /> Kehadiran kelas
              </label>
              <label class="inline-flex items-center gap-1.5" :class="data.item.length ? 'cursor-pointer' : 'opacity-50'">
                <input v-model="aturan[k.key].sumber" type="radio" value="ELEARNING" class="accent-primary" :disabled="!data.item.length" /> E-learning
              </label>
            </div>

            <p v-if="aturan[k.key]?.sumber === 'MANUAL'" class="mt-2 text-label-sm text-on-surface-variant">Nilai di form tidak diubah — isi sendiri.</p>
            <div v-else-if="aturan[k.key]?.sumber === 'KEHADIRAN'" class="mt-2 text-label-sm text-on-surface-variant space-y-1">
              <p>Nilai = jumlah hadir ÷ {{ data.jumlahPertemuan }} pertemuan × 100.</p>
              <label class="inline-flex items-center gap-1.5 cursor-pointer text-on-surface">
                <input v-model="izinSakitHadir" type="checkbox" class="accent-primary" /> Izin & sakit dihitung hadir
              </label>
            </div>
            <div v-else-if="aturan[k.key]?.sumber === 'ELEARNING'" class="mt-2 space-y-2">
              <div class="flex flex-wrap items-center gap-2 text-label-sm">
                <span class="text-on-surface-variant">Pilih kuis / tugas yang dihitung (wajib):</span>
                <button type="button" class="text-primary hover:underline" @click="pilihJenis(k.key, 'KUIS')">+ semua kuis</button>
                <button type="button" class="text-primary hover:underline" @click="pilihJenis(k.key, 'TUGAS')">+ semua tugas</button>
                <button v-if="aturan[k.key].item.length" type="button" class="text-on-surface-variant hover:underline" @click="aturan[k.key].item = []">kosongkan</button>
              </div>
              <div class="max-h-40 overflow-y-auto border border-outline-variant rounded-md divide-y divide-outline-variant">
                <label
                  v-for="i in data.item"
                  :key="i.id"
                  class="flex items-center gap-2 px-2.5 py-1.5 text-body-sm"
                  :class="dipakaiOleh(i.id, k.key) ? 'opacity-50' : 'cursor-pointer hover:bg-surface-container'"
                >
                  <input v-model="aturan[k.key].item" type="checkbox" :value="i.id" class="accent-primary" :disabled="!!dipakaiOleh(i.id, k.key)" />
                  <span class="px-1.5 rounded text-label-sm" :class="JENIS[i.jenis].cls">{{ JENIS[i.jenis].label }}</span>
                  <span class="flex-1 truncate">{{ i.judul }}</span>
                  <span v-if="dipakaiOleh(i.id, k.key)" class="text-label-sm text-on-surface-variant">dipakai di {{ dipakaiOleh(i.id, k.key) }}</span>
                  <span v-else-if="i.pertemuanKe" class="text-label-sm text-on-surface-variant">P{{ i.pertemuanKe }}</span>
                </label>
              </div>
              <p v-if="!aturan[k.key].item.length" class="text-label-sm text-error">Belum ada kuis / tugas yang dipilih.</p>
              <div class="flex flex-wrap gap-x-4 text-label-sm text-on-surface-variant">
                <span>Nilai = rata-rata item terpilih. Yang belum dikerjakan / belum dinilai:</span>
                <label class="inline-flex items-center gap-1 cursor-pointer text-on-surface"><input v-model="aturan[k.key].kosong" type="radio" value="nol" class="accent-primary" /> dihitung 0</label>
                <label class="inline-flex items-center gap-1 cursor-pointer text-on-surface"><input v-model="aturan[k.key].kosong" type="radio" value="lewati" class="accent-primary" /> dilewati</label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Pratinjau -->
      <section v-if="komponenAktif.length">
        <h4 class="text-label-lg font-semibold text-on-surface mb-1">3. Pratinjau Hasil</h4>
        <p class="text-label-sm text-on-surface-variant mb-2">Angka kecil = nilai di form saat ini. Komponen Input manual tidak diubah.</p>
        <div class="max-h-64 overflow-auto border border-outline-variant rounded-lg">
          <table class="w-full text-body-sm border-collapse">
            <thead class="sticky top-0 bg-surface-container text-label-md text-on-surface-variant">
              <tr>
                <th class="p-2 text-left">NIM</th>
                <th class="p-2 text-left">Nama</th>
                <th v-for="k in komponenAktif" :key="k.key" class="p-2 text-center">{{ k.label }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-for="m in mahasiswa" :key="m.mahasiswaId">
                <td class="p-2 whitespace-nowrap text-on-surface-variant">{{ m.nim }}</td>
                <td class="p-2">{{ m.namaLengkap }}</td>
                <td v-for="k in komponenAktif" :key="k.key" class="p-2 text-center tabular-nums">
                  <span class="font-semibold text-primary">{{ hitung(m.mahasiswaId, k.key) ?? '-' }}</span>
                  <span v-if="m.input[k.key]" class="block text-label-sm text-on-surface-variant">sebelumnya {{ m.input[k.key] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton icon="sync" :disabled="loading || !data" @click="terapkan">Terapkan ke Form</AppButton>
    </template>
  </Modal>
</template>
