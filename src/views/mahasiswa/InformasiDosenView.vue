<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { mahasiswaDataKampusApi, type InformasiDosen } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';

/** Link WhatsApp: nomor lokal 08.. diubah ke format internasional 628... */
const waLink = (no: string) => {
  const digit = no.replace(/\D/g, '');
  return `https://wa.me/${digit.startsWith('0') ? `62${digit.slice(1)}` : digit}`;
};

/** Data Kampus → Informasi Dosen: daftar dosen aktif beserta kontak, dicari & dipaginasi di sisi klien. */
const items = ref<InformasiDosen[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const jenis = ref<'' | 'INTERNAL' | 'EKSTERNAL'>('');
const limit = ref(10);
const page = ref(1);

const jenisOptions = [
  { value: 'INTERNAL', label: 'Dosen Tetap (Internal)' },
  { value: 'EKSTERNAL', label: 'Dosen Luar (Eksternal)' },
];

onMounted(async () => {
  try {
    items.value = await mahasiswaDataKampusApi.dosen();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat informasi dosen');
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return items.value.filter((d) => {
    if (jenis.value && d.jenisDosen !== jenis.value) return false;
    if (!q) return true;
    return [d.namaLengkap, d.gelar, d.nidn, d.tempatLahir, d.telpHp, d.noWhatsapp, d.email, d.alamat, d.prodi]
      .some((v) => v?.toLowerCase().includes(q));
  });
});
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / limit.value)));
const paged = computed(() => filtered.value.slice((page.value - 1) * limit.value, page.value * limit.value));
const rangeStart = computed(() => (filtered.value.length ? (page.value - 1) * limit.value + 1 : 0));
watch([search, jenis, limit], () => (page.value = 1));

const namaGelar = (d: InformasiDosen) => [d.namaLengkap, d.gelar].filter(Boolean).join(', ');
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Informasi Dosen</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Daftar dosen beserta kontak yang dapat dihubungi.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
          <PageSizeSelect v-model="limit" />
          <div class="w-full sm:w-60">
            <SelectInput v-model="jenis" placeholder="Semua dosen" :options="jenisOptions" />
          </div>
        </div>
        <SearchInput v-model="search" placeholder="Cari nama, NIDN, kontak..." />
      </div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant">
            <tr class="text-label-md text-primary font-semibold">
              <th class="p-3 text-center">No.</th>
              <th class="p-3">Nama Dosen</th>
              <th class="p-3">NIDN</th>
              <th class="p-3">Tempat Lahir</th>
              <th class="p-3">Tanggal Lahir</th>
              <th class="p-3">No. Telp/HP</th>
              <th class="p-3">WhatsApp</th>
              <th class="p-3">Kontak</th>
              <th class="p-3">Pendidikan Terakhir</th>
              <th class="p-3">Homebase</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface align-top">
            <tr v-if="!paged.length">
              <td colspan="10" class="p-6 text-center text-on-surface-variant">Tidak ada data dosen</td>
            </tr>
            <tr v-for="(d, i) in paged" :key="d.id">
              <td class="p-3 text-center">{{ rangeStart + i }}</td>
              <td class="p-3 min-w-[12rem]">
                <div class="font-medium">{{ namaGelar(d) }}</div>
                <div class="text-label-sm text-on-surface-variant">{{ d.jenisDosen === 'INTERNAL' ? 'Dosen Tetap' : 'Dosen Luar' }}</div>
              </td>
              <td class="p-3 whitespace-nowrap">{{ d.nidn || '-' }}</td>
              <td class="p-3">{{ d.tempatLahir || '-' }}</td>
              <td class="p-3 whitespace-nowrap">{{ d.tanggalLahir ? formatDate(d.tanggalLahir) : '-' }}</td>
              <td class="p-3 whitespace-nowrap">
                <a v-if="d.telpHp" :href="`tel:${d.telpHp}`" class="text-primary hover:underline">{{ d.telpHp }}</a>
                <span v-else class="text-on-surface-variant">-</span>
              </td>
              <td class="p-3 whitespace-nowrap">
                <a v-if="d.noWhatsapp" :href="waLink(d.noWhatsapp)" target="_blank" rel="noopener" class="text-primary hover:underline">{{ d.noWhatsapp }}</a>
                <span v-else class="text-on-surface-variant">-</span>
              </td>
              <td class="p-3 min-w-[14rem] space-y-0.5">
                <div v-if="d.email" class="break-all">
                  <a :href="`mailto:${d.email}`" class="text-primary hover:underline">{{ d.email }}</a>
                </div>
                <div v-if="d.alamat" class="text-on-surface-variant whitespace-pre-line">{{ d.alamat }}</div>
                <span v-if="!d.email && !d.alamat" class="text-on-surface-variant">-</span>
              </td>
              <td class="p-3">{{ d.pendidikanAkhir || '-' }}</td>
              <td class="p-3">{{ d.prodi || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading" class="px-4 py-3 border-t border-outline-variant flex items-center justify-between gap-3 text-body-sm text-on-surface-variant">
        <span>Menampilkan {{ rangeStart }}–{{ Math.min(page * limit, filtered.length) }} dari {{ filtered.length }} dosen</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-3 py-1 rounded-md border border-outline-variant disabled:opacity-40"
            :disabled="page <= 1"
            @click="page--"
          >
            ‹
          </button>
          <span class="px-2">{{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            class="px-3 py-1 rounded-md border border-outline-variant disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="page++"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
