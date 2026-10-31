<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { tesUjianApi, type KandidatPesertaUjian, type TesUjian } from '@/api/tesUjian';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Popup Tambah Peserta Ujian: pilih peserta yang berhak ikut tes ini. Kolom Dokumen = centang hijau bila dokumen sudah
 * lengkap, tulisan merah kecil bila belum.
 */
const props = defineProps<{ tes: TesUjian | null }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ added: [] }>();

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const kandidat = ref<KandidatPesertaUjian[]>([]);
const search = ref('');
const hanyaGelombang = ref(false);
// Tes untuk jurusan tertentu: default hanya peserta jurusan itu, bisa dibuka ke semua jurusan.
const hanyaJurusan = ref(true);
const dipilih = ref<Set<number>>(new Set());

const muat = async () => {
  if (!props.tes) return;
  loading.value = true;
  error.value = null;
  try {
    kandidat.value = await tesUjianApi.listKandidat(props.tes.id, {
      search: search.value.trim(),
      gelombang: hanyaGelombang.value,
      semuaJurusan: !hanyaJurusan.value,
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat daftar peserta');
  } finally {
    loading.value = false;
  }
};

watch(open, (v) => {
  if (!v) return;
  search.value = '';
  hanyaGelombang.value = false;
  hanyaJurusan.value = true;
  dipilih.value = new Set();
  muat();
});
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(muat, 350);
});
watch([hanyaGelombang, hanyaJurusan], muat);

const semuaDipilih = computed(() => kandidat.value.length > 0 && kandidat.value.every((k) => dipilih.value.has(k.pesertaId)));
const toggleSemua = () => {
  const s = new Set(dipilih.value);
  if (semuaDipilih.value) kandidat.value.forEach((k) => s.delete(k.pesertaId));
  else kandidat.value.forEach((k) => s.add(k.pesertaId));
  dipilih.value = s;
};
const toggle = (id: number) => {
  const s = new Set(dipilih.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  dipilih.value = s;
};

const simpan = async () => {
  if (!props.tes || dipilih.value.size === 0) return;
  saving.value = true;
  try {
    const r = await tesUjianApi.tambahPeserta(props.tes.id, [...dipilih.value]);
    toastSuccess(`${r.ditambahkan} peserta ditambahkan`);
    emit('added');
    open.value = false;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menambah peserta ujian'));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" title="Tambah Peserta Ujian" :subtitle="tes ? `${tes.namaUjian} · ${tes.gelombang?.namaGelombang ?? ''}` : undefined" size="2xl">
    <div class="space-y-3">
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex-1 [&>div]:w-full!">
          <SearchInput v-model="search" placeholder="Cari nama atau email peserta..." />
        </div>
        <CheckboxToggle v-if="tes?.prodi" v-model="hanyaJurusan" :label="`Hanya jurusan ${tes.prodi}`" />
        <CheckboxToggle v-model="hanyaGelombang" label="Hanya peserta gelombang ini" />
      </div>

      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div class="overflow-x-auto max-h-[55vh] overflow-y-auto border border-outline-variant rounded-md">
        <table class="w-full text-body-sm">
          <thead class="sticky top-0 z-10">
            <tr class="bg-surface-container text-left text-on-surface">
              <th class="px-3 py-2.5 w-10">
                <input type="checkbox" class="w-4 h-4 accent-primary" :checked="semuaDipilih" :disabled="!kandidat.length" @change="toggleSemua" />
              </th>
              <th class="px-3 py-2.5 font-semibold">Gelombang</th>
              <th class="px-3 py-2.5 font-semibold">Nama</th>
              <th class="px-3 py-2.5 font-semibold">Jurusan 1</th>
              <th class="px-3 py-2.5 font-semibold">Email</th>
              <th class="px-3 py-2.5 font-semibold">Dokumen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="px-3 py-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <template v-else>
              <tr
                v-for="k in kandidat"
                :key="k.pesertaId"
                class="border-b border-outline-variant cursor-pointer hover:bg-surface-container-low"
                @click="toggle(k.pesertaId)"
              >
                <td class="px-3 py-2.5">
                  <input type="checkbox" class="w-4 h-4 accent-primary" :checked="dipilih.has(k.pesertaId)" @click.stop @change="toggle(k.pesertaId)" />
                </td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ k.gelombang ?? '-' }}</td>
                <td class="px-3 py-2.5 font-medium text-on-surface">{{ k.namaLengkap }}</td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ k.jurusan }}</td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ k.email }}</td>
                <td class="px-3 py-2.5">
                  <span v-if="k.dokumenLengkap" class="material-symbols-outlined text-success" style="font-size: 20px" title="Dokumen lengkap">check_circle</span>
                  <span v-else class="text-[11px] text-error">Dokumen belum lengkap</span>
                </td>
              </tr>
              <tr v-if="kandidat.length === 0">
                <td colspan="6" class="px-3 py-8 text-center text-on-surface-variant">Tidak ada peserta yang bisa ditambahkan.</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <span class="text-label-sm text-on-surface-variant mr-auto">{{ dipilih.size }} peserta dipilih</span>
      <AppButton :disabled="saving || dipilih.size === 0" @click="simpan">{{ saving ? 'Menyimpan...' : 'Tambah Peserta Terpilih' }}</AppButton>
      <AppButton variant="danger" @click="open = false">Tutup</AppButton>
    </template>
  </Modal>
</template>
