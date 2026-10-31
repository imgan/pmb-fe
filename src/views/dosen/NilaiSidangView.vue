<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenNilaiSidangApi } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { toastError, toastSuccess } from '@/utils/swal';
import type { NilaiSidangRow, PeranSidang } from '@/types/entities';

const PERAN_LABELS: Record<PeranSidang, string> = {
  PEMBIMBING_1: 'Pembimbing I',
  PEMBIMBING_2: 'Pembimbing II',
  PENGUJI_1: 'Penguji I',
  PENGUJI_2: 'Penguji II',
};

const rowKey = (row: NilaiSidangRow) => `${row.pendaftarSidangId}-${row.peran}`;

const items = ref<NilaiSidangRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
// Nilai yang sedang diketik per baris; terpisah dari items supaya nilai tersimpan tidak
// berubah sebelum dosen menekan Simpan.
const drafts = reactive<Record<string, number | ''>>({});
const savingKey = ref<string | null>(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    items.value = await dosenNilaiSidangApi.list();
    items.value.forEach((row) => {
      drafts[rowKey(row)] = row.nilai ?? '';
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data sidang');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);

const handleSave = async (row: NilaiSidangRow) => {
  const key = rowKey(row);
  const nilai = drafts[key];
  if (nilai === '' || nilai < 0 || nilai > 100) {
    toastError('Nilai wajib diisi antara 0 - 100');
    return;
  }
  savingKey.value = key;
  try {
    const saved = await dosenNilaiSidangApi.save(row.pendaftarSidangId, { peran: row.peran, nilai: Number(nilai) });
    row.nilai = saved.nilai;
    row.grade = saved.grade;
    toastSuccess(`Nilai ${row.mahasiswa.namaLengkap} tersimpan`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan nilai'));
  } finally {
    savingKey.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Nilai Sidang" subtitle="Dosen / Bimbingan / Nilai Sidang" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <p class="px-4 py-3 text-body-sm text-on-surface-variant border-b border-outline-variant">
        Isi nilai (0 - 100) untuk mahasiswa yang Anda bimbing atau uji. Nilai otomatis tercetak di Rekapitulasi Nilai
        Sidang; Nilai Akhir muncul setelah semua pembimbing &amp; penguji mengisi.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant">
            <tr class="text-label-md text-primary font-semibold">
              <th class="p-3">Mahasiswa</th>
              <th class="p-3">Judul</th>
              <th class="p-3">Jadwal Sidang</th>
              <th class="p-3">Peran</th>
              <th class="p-3 text-center">Nilai</th>
              <th class="p-3 text-center">Huruf</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
            <tr v-if="loading">
              <td colspan="7" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <template v-else>
              <tr v-for="row in items" :key="rowKey(row)">
                <td class="p-3">
                  <p class="font-medium">{{ row.mahasiswa.namaLengkap }}</p>
                  <p class="text-on-surface-variant">{{ row.mahasiswa.nim }}</p>
                </td>
                <td class="p-3 max-w-xs">{{ row.judul }}</td>
                <td class="p-3 whitespace-nowrap">
                  <template v-if="row.jadwalSidang">
                    {{ formatDate(row.jadwalSidang.tanggal) }}, {{ row.jadwalSidang.jam }}
                    <span v-if="row.jadwalSidang.ruangan" class="block text-on-surface-variant">{{ row.jadwalSidang.ruangan }}</span>
                  </template>
                  <span v-else class="text-on-surface-variant">Belum dijadwalkan</span>
                </td>
                <td class="p-3 whitespace-nowrap">{{ PERAN_LABELS[row.peran] }}</td>
                <td class="p-3 text-center">
                  <input
                    v-model.number="drafts[rowKey(row)]"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-24 px-2 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    @keyup.enter="handleSave(row)"
                  />
                </td>
                <td class="p-3 text-center font-semibold">{{ row.grade ?? '-' }}</td>
                <td class="p-3 text-right">
                  <AppButton :disabled="savingKey === rowKey(row)" @click="handleSave(row)">
                    {{ savingKey === rowKey(row) ? 'Menyimpan...' : 'Simpan' }}
                  </AppButton>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="7" class="p-8 text-center text-on-surface-variant">
                  Belum ada mahasiswa sidang yang Anda bimbing atau uji.
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
