<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { dosenKrsBimbinganApi, type KrsBimbinganRow, type StatusKrsBimbingan } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

// Persetujuan KRS oleh Dosen Pembimbing Akademik. Hanya KRS mahasiswa bimbingan dosen ini yang
// tampil; yang berstatus "Diajukan" bisa disetujui / ditolak. BAAK juga bisa mengubah status
// KRS (hak prerogatif) lewat menu KRS Mahasiswa.
const STATUS_OPTIONS = [
  { value: 'DIAJUKAN', label: 'Menunggu Persetujuan' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
  { value: 'SEMUA', label: 'Semua' },
];
const STATUS_BADGE: Record<StatusKrsBimbingan, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  DIAJUKAN: { label: 'Diajukan', variant: 'warning' },
  DISETUJUI: { label: 'Disetujui', variant: 'success' },
  DITOLAK: { label: 'Ditolak', variant: 'danger' },
};
const HARI: Record<string, string> = { SENIN: 'Sen', SELASA: 'Sel', RABU: 'Rab', KAMIS: 'Kam', JUMAT: 'Jum', SABTU: 'Sab' };

const status = ref<StatusKrsBimbingan | 'SEMUA'>('DIAJUKAN');
const rows = ref<KrsBimbinganRow[]>([]);
const jumlahBimbingan = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const expanded = ref<Set<number>>(new Set());
const processingId = ref<number | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await dosenKrsBimbinganApi.list({ status: status.value });
    rows.value = result.rows;
    jumlahBimbingan.value = result.jumlahBimbingan;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat KRS bimbingan');
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(status, load);

// Persetujuan massal: centang KRS berstatus Diajukan lalu klik Setujui.
const selectedIds = ref<number[]>([]);
const approving = ref(false);
const diajukanIds = computed(() => rows.value.filter((r) => r.status === 'DIAJUKAN').map((r) => r.id));
watch(rows, () => {
  selectedIds.value = selectedIds.value.filter((id) => diajukanIds.value.includes(id));
});
const allSelected = computed(() => diajukanIds.value.length > 0 && diajukanIds.value.every((id) => selectedIds.value.includes(id)));
const toggleAll = () => {
  selectedIds.value = allSelected.value ? [] : [...diajukanIds.value];
};
const toggleSelect = (id: number) => {
  selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((x) => x !== id) : [...selectedIds.value, id];
};
const setujuiTerpilih = async () => {
  const ok = await confirmAction({
    title: `Setujui ${selectedIds.value.length} KRS?`,
    text: 'KRS mahasiswa bimbingan yang dipilih akan disetujui.',
    confirmLabel: 'Ya, setujui',
  });
  if (!ok) return;
  approving.value = true;
  try {
    const hasil = await dosenKrsBimbinganApi.setujuiMassal(selectedIds.value);
    if (hasil.dilewati.length) {
      toastError(`${hasil.disetujui} KRS disetujui, ${hasil.dilewati.length} dilewati: ${[...new Set(hasil.dilewati.map((d) => d.alasan))].join('; ')}`);
    } else toastSuccess(`${hasil.disetujui} KRS disetujui`);
    selectedIds.value = [];
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyetujui KRS'));
  } finally {
    approving.value = false;
  }
};

const toggle = (id: number) => {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
};

const proses = async (krs: KrsBimbinganRow, aksi: 'setujui' | 'tolak') => {
  const ok = await confirmAction({
    title: aksi === 'setujui' ? 'Setujui KRS?' : 'Tolak KRS?',
    text: `${krs.mahasiswa.nim} - ${krs.mahasiswa.namaLengkap}, semester ${krs.semester} (${krs.detailList.length} MK, ${krs.totalSks} SKS).${
      aksi === 'tolak' ? ' Mahasiswa perlu mengajukan ulang KRS-nya.' : ''
    }`,
    confirmLabel: aksi === 'setujui' ? 'Ya, setujui' : 'Ya, tolak',
    danger: aksi === 'tolak',
  });
  if (!ok) return;
  processingId.value = krs.id;
  try {
    if (aksi === 'setujui') await dosenKrsBimbinganApi.setujui(krs.id);
    else await dosenKrsBimbinganApi.tolak(krs.id);
    toastSuccess(aksi === 'setujui' ? 'KRS disetujui' : 'KRS ditolak');
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memproses KRS'));
  } finally {
    processingId.value = null;
  }
};
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg text-primary">KRS Bimbingan</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Persetujuan KRS mahasiswa bimbingan akademik Anda ({{ jumlahBimbingan }} mahasiswa).
      </p>
    </header>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-wrap items-end justify-between gap-3">
        <div class="w-64">
          <SelectInput v-model="status" label="Status" :options="STATUS_OPTIONS" />
        </div>
        <div v-if="diajukanIds.length" class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            Pilih semua yang diajukan
          </label>
          <AppButton v-if="selectedIds.length" icon="check" :disabled="approving" @click="setujuiTerpilih">
            {{ approving ? 'Memproses...' : `Setujui (${selectedIds.length})` }}
          </AppButton>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="!jumlahBimbingan" class="p-8 text-center text-body-sm text-on-surface-variant">
        Anda belum ditetapkan sebagai pembimbing akademik mahasiswa mana pun. Hubungi Prodi untuk penetapan pembimbing akademik.
      </p>
      <p v-else-if="!rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">Tidak ada KRS dengan status ini.</p>

      <div v-else class="divide-y divide-outline-variant">
        <div v-for="krs in rows" :key="krs.id" class="p-4">
          <div class="flex flex-col md:flex-row md:items-center gap-3">
            <input
              v-if="krs.status === 'DIAJUKAN'"
              type="checkbox"
              class="self-start md:self-center"
              aria-label="Pilih KRS"
              :checked="selectedIds.includes(krs.id)"
              @change="toggleSelect(krs.id)"
            />
            <button type="button" class="flex-1 text-left" @click="toggle(krs.id)">
              <p class="text-body-md font-medium text-on-surface">
                {{ krs.mahasiswa.nim }} — {{ krs.mahasiswa.namaLengkap }}
                <StatusBadge class="ml-2 align-middle" v-bind="STATUS_BADGE[krs.status]" />
              </p>
              <p class="text-body-sm text-on-surface-variant">
                {{ krs.mahasiswa.jurusan?.namaJurusan ?? '-' }} · Semester {{ krs.semester }} ·
                {{ krs.tahunAjaran ? `${krs.tahunAjaran.nama} ${krs.tahunAjaran.jenisSemester}` : '-' }} ·
                {{ krs.detailList.length }} MK, {{ krs.totalSks }} SKS
                <span class="text-primary">· {{ expanded.has(krs.id) ? 'sembunyikan' : 'lihat' }} mata kuliah</span>
              </p>
            </button>
            <div v-if="krs.status === 'DIAJUKAN'" class="flex gap-2">
              <AppButton variant="secondary" icon="close" :disabled="processingId === krs.id" @click="proses(krs, 'tolak')">Tolak</AppButton>
              <AppButton icon="check" :disabled="processingId === krs.id" @click="proses(krs, 'setujui')">Setujui</AppButton>
            </div>
          </div>

          <div v-if="expanded.has(krs.id)" class="mt-3 overflow-x-auto">
            <table class="w-full text-left border-collapse text-body-sm">
              <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
                <tr>
                  <th class="p-2">Kode</th>
                  <th class="p-2">Mata Kuliah</th>
                  <th class="p-2 text-center">SKS</th>
                  <th class="p-2">Kelas</th>
                  <th class="p-2">Jadwal</th>
                  <th class="p-2">Dosen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="d in krs.detailList" :key="d.id">
                  <td class="p-2">{{ d.kelasKuliah?.kodeMataKuliah }}</td>
                  <td class="p-2">{{ d.kelasKuliah?.namaMataKuliah }}</td>
                  <td class="p-2 text-center tabular-nums">{{ d.kelasKuliah?.sks ?? 0 }}</td>
                  <td class="p-2">{{ d.kelasKuliah?.kelas }}</td>
                  <td class="p-2 whitespace-nowrap">
                    {{ (d.kelasKuliah?.hari ?? []).map((h) => HARI[h] ?? h).join(', ') || '-' }}{{ d.kelasKuliah?.jam ? ` / ke-${d.kelasKuliah.jam}` : '' }}
                  </td>
                  <td class="p-2">{{ d.kelasKuliah?.dosenKordinator?.namaLengkap ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
