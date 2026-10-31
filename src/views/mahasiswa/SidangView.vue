<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { mahasiswaSidangApi, type SidangMahasiswa } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate, formatDateTime } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

/**
 * Pengajuan sidang TA/Skripsi: syarat (judul disetujui), pilih jadwal sidang prodi, lalu pantau
 * jadwal, nilai sidang, dan lembar koreksi/revisi dari dosen.
 */
const data = ref<SidangMahasiswa | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const pilihJadwal = ref<number | null>(null);
const pilihOpen = ref(false);
const saving = ref(false);
const batalOpen = ref(false);
const membatalkan = ref(false);

const load = async () => {
  try {
    data.value = await mahasiswaSidangApi.get();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data sidang');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const pendaftaran = computed(() => data.value?.pendaftaran ?? null);
const bukaPilih = () => {
  pilihJadwal.value = pendaftaran.value?.jadwal?.id ?? null;
  pilihOpen.value = true;
};

const daftar = async () => {
  if (!pilihJadwal.value) {
    error.value = 'Pilih salah satu jadwal sidang';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const res = await mahasiswaSidangApi.daftar(pilihJadwal.value);
    data.value = res.data;
    toastSuccess(res.message);
    pilihOpen.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mendaftar sidang');
  } finally {
    saving.value = false;
  }
};

const batal = async () => {
  membatalkan.value = true;
  try {
    await mahasiswaSidangApi.batal();
    toastSuccess('Pendaftaran sidang dibatalkan');
    batalOpen.value = false;
    await load();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membatalkan pendaftaran');
    batalOpen.value = false;
  } finally {
    membatalkan.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Pengajuan Sidang</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Daftar sidang Tugas Akhir/Skripsi, lihat jadwal, nilai, dan lembar koreksi.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="text-body-sm text-on-surface-variant">Memuat data sidang...</div>

    <template v-else-if="data">
      <!-- Syarat: judul TA disetujui -->
      <div
        v-if="!data.pengajuanTa"
        class="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center text-body-md text-on-surface-variant"
      >
        Pendaftaran sidang dibuka setelah judul TA/Skripsi Anda disetujui prodi (menu Pengajuan → Pendaftaran Judul Skripsi/TA).
      </div>

      <template v-else>
        <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 md:p-6 mb-6">
          <dl class="grid grid-cols-[170px_1fr] gap-y-2 text-body-md">
            <dt class="text-on-surface-variant">Judul</dt>
            <dd class="text-on-surface">: {{ pendaftaran?.judul ?? data.pengajuanTa.judul }}</dd>
            <dt class="text-on-surface-variant">Pembimbing Utama</dt>
            <dd class="text-on-surface">: {{ pendaftaran?.pembimbing1 ?? data.pengajuanTa.pembimbingUtama ?? '-' }}</dd>
            <dt class="text-on-surface-variant">Pembimbing Pendamping</dt>
            <dd class="text-on-surface">: {{ pendaftaran?.pembimbing2 ?? data.pengajuanTa.pembimbingPendamping ?? '-' }}</dd>
            <dt class="text-on-surface-variant">Jumlah Bimbingan</dt>
            <dd class="text-on-surface">: {{ data.pengajuanTa.jumlahBimbingan }} kali</dd>
          </dl>
        </section>

        <!-- Status pendaftaran -->
        <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-6">
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Jadwal Sidang</div>
          <div class="p-4 md:p-6">
            <template v-if="pendaftaran?.jadwal">
              <dl class="grid grid-cols-[170px_1fr] gap-y-2 text-body-md">
                <dt class="text-on-surface-variant">Tanggal</dt>
                <dd class="text-on-surface font-semibold">: {{ formatDate(pendaftaran.jadwal.tanggal) }}</dd>
                <dt class="text-on-surface-variant">Jam</dt>
                <dd class="text-on-surface">: {{ pendaftaran.jadwal.jam }}</dd>
                <dt class="text-on-surface-variant">Ruangan</dt>
                <dd class="text-on-surface">: {{ pendaftaran.jadwal.ruangan || '-' }}</dd>
                <dt class="text-on-surface-variant">Penguji</dt>
                <dd class="text-on-surface">: {{ pendaftaran.jadwal.penguji ?? '-' }}</dd>
                <dt class="text-on-surface-variant">Terdaftar</dt>
                <dd class="text-on-surface">: {{ formatDateTime(pendaftaran.tanggalDaftar) }}</dd>
              </dl>
              <div v-if="pendaftaran.bisaDiubah" class="mt-4 flex gap-2">
                <AppButton variant="secondary" icon="event" @click="bukaPilih">Pindah Jadwal</AppButton>
                <AppButton variant="danger" @click="batalOpen = true">Batalkan Pendaftaran</AppButton>
              </div>
            </template>
            <template v-else-if="pendaftaran">
              <p class="text-body-md text-on-surface-variant">Anda sudah terdaftar sidang, jadwal belum ditentukan prodi.</p>
              <AppButton v-if="pendaftaran.bisaDiubah && data.jadwalTersedia.length" class="mt-3" icon="event" @click="bukaPilih">Pilih Jadwal</AppButton>
            </template>
            <template v-else>
              <p class="text-body-md text-on-surface-variant mb-3">Anda belum mendaftar sidang.</p>
              <AppButton v-if="data.jadwalTersedia.length" icon="how_to_reg" @click="bukaPilih">Daftar Sidang</AppButton>
              <p v-else class="text-body-sm text-on-surface-variant">Belum ada jadwal sidang yang dibuka prodi.</p>
            </template>

            <!-- Pilih jadwal -->
            <div v-if="pilihOpen" class="mt-4 border-t border-outline-variant pt-4">
              <p class="text-label-md font-medium text-on-surface mb-2">Pilih jadwal sidang</p>
              <div class="space-y-2">
                <label
                  v-for="j in data.jadwalTersedia"
                  :key="j.id"
                  class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                  :class="pilihJadwal === j.id ? 'border-primary bg-primary-container/40' : 'border-outline-variant'"
                >
                  <input v-model="pilihJadwal" type="radio" name="jadwal-sidang" :value="j.id" class="mt-1" />
                  <span class="text-body-md">
                    <span class="block font-medium text-on-surface">{{ formatDate(j.tanggal) }} · {{ j.jam }}</span>
                    <span class="block text-body-sm text-on-surface-variant">
                      Ruang {{ j.ruangan || '-' }} · Penguji {{ j.penguji ?? '-' }}<template v-if="j.tahunAjaran"> · {{ j.tahunAjaran }}</template>
                    </span>
                  </span>
                </label>
              </div>
              <div class="mt-3 flex gap-2">
                <AppButton :disabled="saving" @click="daftar">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
                <AppButton variant="secondary" @click="pilihOpen = false">Batal</AppButton>
              </div>
            </div>
          </div>
        </section>

        <!-- Nilai sidang -->
        <section v-if="pendaftaran" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mb-6">
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex justify-between">
            <span>Nilai Sidang</span>
            <span v-if="pendaftaran.rataRata !== null">Rata-rata {{ pendaftaran.rataRata }}</span>
          </div>
          <div v-if="!pendaftaran.nilai.length" class="p-4 text-body-sm text-on-surface-variant">Belum ada nilai sidang.</div>
          <table v-else class="w-full text-body-sm">
            <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th class="px-4 py-2 text-left font-medium">Peran</th>
                <th class="px-4 py-2 text-left font-medium">Dosen</th>
                <th class="px-4 py-2 text-center font-medium">Nilai</th>
                <th class="px-4 py-2 text-center font-medium">Huruf</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-for="(n, i) in pendaftaran.nilai" :key="i">
                <td class="px-4 py-2">{{ n.peran }}</td>
                <td class="px-4 py-2">{{ n.dosen ?? '-' }}</td>
                <td class="px-4 py-2 text-center">{{ n.nilai ?? '-' }}</td>
                <td class="px-4 py-2 text-center font-semibold">{{ n.grade }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Lembar koreksi -->
        <section v-if="pendaftaran" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Lembar Koreksi / Revisi</div>
          <div v-if="!pendaftaran.koreksi.length" class="p-4 text-body-sm text-on-surface-variant">Belum ada koreksi dari dosen.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-body-sm">
              <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th class="px-4 py-2 text-left font-medium">Dosen</th>
                  <th class="px-4 py-2 text-left font-medium">Bab / Halaman</th>
                  <th class="px-4 py-2 text-left font-medium">Uraian Koreksi</th>
                  <th class="px-4 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant align-top">
                <tr v-for="k in pendaftaran.koreksi" :key="k.id">
                  <td class="px-4 py-2 min-w-40">
                    <span class="block">{{ k.dosen ?? '-' }}</span>
                    <span class="block text-label-sm text-on-surface-variant">{{ k.peran }}</span>
                  </td>
                  <td class="px-4 py-2">{{ k.babHalaman || '-' }}</td>
                  <td class="px-4 py-2 min-w-56 whitespace-pre-line">{{ k.uraian }}</td>
                  <td class="px-4 py-2 text-center whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded-full text-label-sm"
                      :class="k.isSelesai ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'"
                    >
                      {{ k.isSelesai ? 'Selesai' : 'Perlu revisi' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>

    <ConfirmDialog
      :open="batalOpen"
      title="Batalkan Pendaftaran Sidang"
      message="Batalkan pendaftaran sidang Anda?"
      :loading="membatalkan"
      @confirm="batal"
      @cancel="batalOpen = false"
    />
  </div>
</template>
