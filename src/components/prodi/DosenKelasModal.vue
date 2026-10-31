<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { http, extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import type { ApiResponse } from '@/types/common';
import type { DosenPengajarKelas } from '@/api/dosenPortal';

/**
 * Prodi → Dosen → Detail: kelas yang diajar satu dosen pada tahun akademik terpilih (dibatasi
 * kelas prodi sesi), dengan peran dosen di tiap kelas (Dosen Pengajar ke-, Penanggung Jawab, SKS,
 * Isi Kuesioner). Baris bisa dibuka untuk melihat tim dosen pengajar kelas tsb. Dengan `canEdit`,
 * centang Isi Kuesioner bisa diubah (per dosen per kelas).
 */
interface KelasDosen {
  id: number;
  kelas: string;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  sks: number | null;
  semester: number | null;
  tahunAjaran: string | null;
  ruangan: string | null;
  programStudi: string | null;
  peserta: number;
  hari: string[];
  jam: number | null;
  dosenKe: number | null;
  sksDosen: number | null;
  penanggungJawab: boolean;
  isiKuesioner: boolean;
  dosenPengajar: DosenPengajarKelas[];
}
interface KelasDosenResult {
  dosen: { id: number; nidn: string | null; nama: string };
  kelas: KelasDosen[];
  ringkasan: { jumlahKelas: number; totalSks: number; penanggungJawab: number };
  tahunAjaranId: number | null;
  tahunAjaran: string | null;
}

const props = defineProps<{
  dosenId: number | null;
  /** Nama untuk judul selagi data dimuat. */
  dosenNama?: string;
  tahunAjaranOptions: { value: number; label: string }[];
  /** Tahun ajaran awal (mis. tahun akademik sesi). */
  tahunAjaranAwal?: number | '' | null;
  /** Boleh mengubah centang Isi Kuesioner (izin ubah menu Dosen). */
  canEdit?: boolean;
}>();
const open = defineModel<boolean>({ default: false });

const tahunAjaranId = ref<number | ''>('');
const data = ref<KelasDosenResult | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const expanded = ref<number | null>(null);

const muat = async () => {
  if (!props.dosenId) return;
  loading.value = true;
  error.value = null;
  expanded.value = null;
  try {
    const res = await http.get<ApiResponse<KelasDosenResult>>(`/prodi/dosen/${props.dosenId}/kelas`, {
      params: { tahunAjaranId: tahunAjaranId.value || undefined },
    });
    data.value = res.data.data;
    if (!tahunAjaranId.value && data.value.tahunAjaranId) tahunAjaranId.value = data.value.tahunAjaranId;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas dosen');
  } finally {
    loading.value = false;
  }
};

watch(open, (v) => {
  if (!v) return;
  data.value = null;
  tahunAjaranId.value = props.tahunAjaranAwal || '';
  muat();
});

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const formatJadwal = (hari?: string[] | null, jam?: number | null) =>
  [(hari ?? []).map(titleCase).join(', '), jam ? `Jam ke-${jam}` : ''].filter(Boolean).join(', ') || '-';
const formatSks = (n: number | null) => (n === null ? '-' : n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// ---- Ubah centang Isi Kuesioner ----
const savingKey = ref<string | null>(null);
const key = (jadwalId: number, dosenId: number) => `${jadwalId}-${dosenId}`;
const toggleKuesioner = async (k: KelasDosen, dosenId: number, nilai: boolean) => {
  savingKey.value = key(k.id, dosenId);
  try {
    const res = await http.put<ApiResponse<{ isiKuesioner: boolean }>>(`/prodi/dosen/${dosenId}/kelas/${k.id}/kuesioner`, { isiKuesioner: nilai });
    const isi = res.data.data.isiKuesioner;
    const d = k.dosenPengajar.find((x) => x.dosenId === dosenId);
    if (d) d.isiKuesioner = isi;
    if (dosenId === data.value?.dosen.id) k.isiKuesioner = isi;
    toastSuccess(res.data.message);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengubah Isi Kuesioner'));
  } finally {
    savingKey.value = null;
  }
};

const subtitle = computed(() => (data.value ? `${data.value.dosen.nidn ?? '-'} - ${data.value.dosen.nama}` : props.dosenNama ?? ''));
</script>

<template>
  <Modal v-model="open" title="Detail Dosen Pengajar" :subtitle="subtitle" size="xl">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
      <div class="w-full md:w-72">
        <SelectInput
          v-model="tahunAjaranId"
          label="Tahun Akademik"
          :options="tahunAjaranOptions"
          placeholder="Tahun akademik aktif"
          :clearable="false"
          @change="muat"
        />
      </div>
      <div v-if="data" class="flex flex-wrap gap-2 text-body-sm">
        <span class="px-3 py-1.5 rounded-md bg-surface-container">
          <strong class="tabular-nums">{{ data.ringkasan.jumlahKelas }}</strong> kelas
        </span>
        <span class="px-3 py-1.5 rounded-md bg-surface-container">
          <strong class="tabular-nums">{{ formatSks(data.ringkasan.totalSks) }}</strong> SKS
        </span>
        <span class="px-3 py-1.5 rounded-md bg-surface-container">
          Penanggung jawab <strong class="tabular-nums">{{ data.ringkasan.penanggungJawab }}</strong> kelas
        </span>
      </div>
    </div>

    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-else-if="loading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat kelas...</div>
    <p v-else-if="data && !data.kelas.length" class="py-8 text-center text-body-sm text-on-surface-variant">
      Dosen ini tidak mengajar kelas prodi pada {{ data.tahunAjaran ?? 'tahun akademik ini' }}.
    </p>
    <div v-else-if="data" class="overflow-x-auto border border-outline-variant rounded-md">
      <table class="w-full text-left border-collapse text-body-sm">
        <thead class="bg-primary text-on-primary text-label-md">
          <tr>
            <th class="px-3 py-2.5 w-10 text-center">No</th>
            <th class="px-3 py-2.5">Mata Kuliah</th>
            <th class="px-3 py-2.5">Kelas</th>
            <th class="px-3 py-2.5">Jadwal</th>
            <th class="px-3 py-2.5 text-center">Dosen ke-</th>
            <th class="px-3 py-2.5 text-center">SKS</th>
            <th class="px-3 py-2.5 text-center">Penanggung Jawab</th>
            <th class="px-3 py-2.5 text-center">Isi Kuesioner</th>
            <th class="px-3 py-2.5 text-center">Peserta</th>
            <th class="px-3 py-2.5 text-center">Tim</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(k, i) in data.kelas" :key="k.id">
            <tr class="border-t border-outline-variant hover:bg-surface-container-low">
              <td class="px-3 py-2.5 text-center">{{ i + 1 }}</td>
              <td class="px-3 py-2.5">
                <span class="font-medium text-on-surface">{{ k.namaMataKuliah }}</span>
                <span class="block text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · {{ k.sks ?? 0 }} SKS</span>
              </td>
              <td class="px-3 py-2.5">{{ k.kelas }}</td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                {{ formatJadwal(k.hari, k.jam) }}
                <span v-if="k.ruangan" class="block text-label-sm text-on-surface-variant">{{ k.ruangan }}</span>
              </td>
              <td class="px-3 py-2.5 text-center tabular-nums">{{ k.dosenKe ?? '-' }}</td>
              <td class="px-3 py-2.5 text-center tabular-nums">{{ formatSks(k.sksDosen) }}</td>
              <td class="px-3 py-2.5 text-center">
                <span class="material-symbols-outlined" :class="k.penanggungJawab ? 'text-[#059669]' : 'text-error'" style="font-size: 20px">
                  {{ k.penanggungJawab ? 'check' : 'close' }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-center">
                <button
                  v-if="canEdit"
                  type="button"
                  role="checkbox"
                  :aria-checked="k.isiKuesioner"
                  :disabled="savingKey === key(k.id, data.dosen.id)"
                  class="inline-flex items-center justify-center w-6 h-6 rounded border-2 transition-colors disabled:opacity-50"
                  :class="k.isiKuesioner ? 'bg-[#059669] border-[#059669] text-white' : 'border-outline bg-surface-container-lowest text-transparent hover:border-[#059669]'"
                  :title="k.isiKuesioner ? 'Klik untuk hapus centang (tidak dinilai kuesioner)' : 'Klik untuk centang (dinilai kuesioner)'"
                  @click="toggleKuesioner(k, data.dosen.id, !k.isiKuesioner)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">check</span>
                </button>
                <span v-else class="material-symbols-outlined" :class="k.isiKuesioner ? 'text-[#059669]' : 'text-error'" style="font-size: 20px">
                  {{ k.isiKuesioner ? 'check' : 'close' }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-center tabular-nums">{{ k.peserta }}</td>
              <td class="px-3 py-2.5 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-0.5 text-primary hover:underline text-label-md whitespace-nowrap"
                  :aria-expanded="expanded === k.id"
                  @click="expanded = expanded === k.id ? null : k.id"
                >
                  {{ k.dosenPengajar.length }} dosen
                  <span class="material-symbols-outlined" style="font-size: 18px">{{ expanded === k.id ? 'expand_less' : 'expand_more' }}</span>
                </button>
              </td>
            </tr>
            <tr v-if="expanded === k.id" class="bg-surface-container-low">
              <td></td>
              <td colspan="9" class="px-3 py-3">
                <p class="font-semibold text-label-md text-on-surface mb-2">Dosen Pengajar kelas {{ k.kelas }}</p>
                <ul class="space-y-1.5">
                  <li v-for="d in k.dosenPengajar" :key="d.dosenId" class="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span class="font-medium text-[#059669] w-32">Dosen Pengajar {{ d.urutan }}</span>
                    <span :class="d.saya ? 'font-semibold text-on-surface' : 'text-on-surface'">{{ d.nidn ?? '-' }} - {{ d.nama }}</span>
                    <span class="text-on-surface-variant tabular-nums">{{ formatSks(d.sks) }} SKS</span>
                    <span class="inline-flex items-center gap-0.5">
                      <span class="material-symbols-outlined" :class="d.penanggungJawab ? 'text-[#059669]' : 'text-error'" style="font-size: 16px">
                        {{ d.penanggungJawab ? 'check' : 'close' }}
                      </span>
                      Penanggung Jawab
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <button
                      v-if="canEdit"
                      type="button"
                      role="checkbox"
                      :aria-checked="d.isiKuesioner"
                      :disabled="savingKey === key(k.id, d.dosenId)"
                      class="inline-flex items-center justify-center w-6 h-6 rounded border-2 transition-colors disabled:opacity-50"
                      :class="d.isiKuesioner ? 'bg-[#059669] border-[#059669] text-white' : 'border-outline bg-surface-container-lowest text-transparent hover:border-[#059669]'"
                      :title="d.isiKuesioner ? 'Klik untuk hapus centang (tidak dinilai kuesioner)' : 'Klik untuk centang (dinilai kuesioner)'"
                      @click="toggleKuesioner(k, d.dosenId, !d.isiKuesioner)"
                >
                      <span class="material-symbols-outlined" style="font-size: 16px">check</span>
                </button>
                      <span v-else class="material-symbols-outlined" :class="d.isiKuesioner ? 'text-[#059669]' : 'text-error'" style="font-size: 16px">
                        {{ d.isiKuesioner ? 'check' : 'close' }}
                      </span>
                      Isi Kuesioner
                    </span>
                  </li>
                </ul>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <p class="mt-3 text-label-sm text-on-surface-variant">
      Isi Kuesioner = dosen dinilai mahasiswa melalui kuesioner kelas<template v-if="canEdit"> — klik kotak centang untuk mengubah</template>.
      Susunan dosen pengajar diatur di Jadwal Kuliah.
    </p>
  </Modal>
</template>
