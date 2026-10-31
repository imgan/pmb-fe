<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import JadwalUjianPanel from '@/components/jadwal/JadwalUjianPanel.vue';
import { jadwalUjianApi } from '@/api/jadwalUjian';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { jurusanApi } from '@/api/jurusan';
import { usePermission } from '@/composables/usePermission';
import { useProdiContext } from '@/composables/useProdiContext';
import { MENU } from '@/constants/menuCodes';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

/**
 * Prodi → Jadwal Kuliah → Jadwal Ujian: daftar kelas dari jadwal kuliah BAAK (prodi sesi);
 * prodi mengisi Status, Sifat & Tanggal Ujian. Dosen bisa mengisi sendiri dari portal dosen.
 */
const { canUpdate } = usePermission(MENU.PRODI_JADWAL_UJIAN_MANAGEMENT);
const { tahunAjaranId: tahunAjaranSesi, prodiLocked, defaultJurusanId } = useProdiContext();

// Filter prodi: terkunci ke prodi sesi bila sudah dipilih saat login (backend juga membatasi).
const prodiOptions = ref<{ value: number; label: string }[]>([]);

const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const defaultTahunAjaranId = ref<number | ''>(tahunAjaranSesi ?? '');

onMounted(async () => {
  jurusanApi
    .listProdi()
    .then(({ data }) => (prodiOptions.value = data.map((j) => ({ value: j.id, label: j.namaJurusan }))))
    .catch(() => (prodiOptions.value = []));
  try {
    const { data } = await tahunAjaranApi.list({ limit: 100 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai || b.jenisSemester.localeCompare(a.jenisSemester))
      .map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${t.isActive ? ' (aktif)' : ''}` }));
    if (!defaultTahunAjaranId.value) defaultTahunAjaranId.value = data.find((t) => t.isActive)?.id ?? '';
  } catch {
    tahunAjaranOptions.value = [];
  }
});
</script>

<template>
  <div>
    <PageHeader title="Master Jadwal Ujian" subtitle="Jadwal UTS/UAS per kelas dari jadwal kuliah; isi status, sifat & tanggal ujian." />
    <JadwalUjianPanel
      :api="jadwalUjianApi"
      :can-update="canUpdate"
      :tahun-ajaran-options="tahunAjaranOptions"
      :default-tahun-ajaran-id="defaultTahunAjaranId"
      :prodi-options="prodiOptions"
      :default-jurusan-id="defaultJurusanId ?? ''"
      :prodi-locked="prodiLocked"
    />
  </div>
</template>
