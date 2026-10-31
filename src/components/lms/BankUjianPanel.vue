<script setup lang="ts">
import { ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import BankUjianFormModal from './BankUjianFormModal.vue';
import { bankUjianApi, type BankUjianRingkas } from '@/api/bankUjian';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { formatDate, formatDateTime } from '@/utils/format';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

/** LMS → Kuis & Ujian → tab Bank Ujian: paket soal PG + essay buatan admin, dipakai tes seleksi PMB. */
const { canCreate, canUpdate, canDelete } = usePermission(MENU.LMS_KUIS_MANAGEMENT);

const rows = ref<BankUjianRingkas[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');

const muat = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await bankUjianApi.list(search.value.trim());
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat bank ujian');
  } finally {
    loading.value = false;
  }
};
muat();
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(muat, 350);
});

const formOpen = ref(false);
const editId = ref<number | null>(null);
const bukaForm = (id: number | null) => {
  editId.value = id;
  formOpen.value = true;
};

const hapus = async (b: BankUjianRingkas) => {
  const ok = await confirmAction({ title: 'Hapus bank ujian?', text: `"${b.judul}" beserta ${b.jumlahSoal} soalnya akan dihapus.`, confirmLabel: 'Hapus', danger: true });
  if (!ok) return;
  try {
    await bankUjianApi.remove(b.id);
    toastSuccess('Bank ujian dihapus');
    muat();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus bank ujian'));
  }
};
</script>

<template>
  <div>
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
      <SearchInput v-model="search" placeholder="Cari judul ujian..." />
      <AppButton v-if="canCreate" icon="add" @click="bukaForm(null)">Tambah Ujian</AppButton>
    </div>
    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden" :class="{ 'opacity-60': loading }">
      <div class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Ujian</th>
              <th class="text-center font-semibold px-2 py-3">PG</th>
              <th class="text-center font-semibold px-2 py-3">Essay</th>
              <th class="text-center font-semibold px-2 py-3">Durasi</th>
              <th class="text-left font-semibold px-3 py-3">Dipakai Tes PMB</th>
              <th class="text-right font-semibold px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length">
              <td colspan="6" class="px-4 py-10 text-center text-on-surface-variant">Belum ada bank ujian. Klik "Tambah Ujian" untuk membuat paket soal.</td>
            </tr>
            <tr v-for="b in rows" :key="b.id" class="border-t border-outline-variant hover:bg-surface-container-low">
              <td class="px-4 py-3">
                <button type="button" class="flex items-center gap-3 text-left group" @click="bukaForm(b.id)">
                  <span class="material-symbols-outlined rounded-md p-1.5 bg-primary/10 text-primary" style="font-size: 18px">quiz</span>
                  <span class="min-w-0">
                    <span class="block font-semibold text-on-surface group-hover:text-primary">{{ b.judul }}</span>
                    <span class="block text-label-sm text-on-surface-variant">
                      {{ b.jumlahSoal }} soal · total bobot {{ b.totalBobot }}{{ b.acakSoal ? ' · diacak' : '' }} · diubah {{ formatDateTime(b.updatedAt) }}
                    </span>
                  </span>
                </button>
              </td>
              <td class="px-2 py-3 text-center tabular-nums">{{ b.jumlahPg }}</td>
              <td class="px-2 py-3 text-center tabular-nums">{{ b.jumlahEssay }}</td>
              <td class="px-2 py-3 text-center whitespace-nowrap">{{ b.durasiMenit ? `${b.durasiMenit} menit` : 'Tanpa batas' }}</td>
              <td class="px-3 py-3">
                <span v-if="!b.dipakaiTes.length" class="text-on-surface-variant">–</span>
                <span v-for="t in b.dipakaiTes" :key="t.id" class="block text-label-sm">{{ t.namaUjian }} <span class="text-on-surface-variant">({{ formatDate(t.tanggal) }})</span></span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button v-if="canUpdate" type="button" class="p-1 text-on-surface-variant hover:text-primary" title="Ubah" @click="bukaForm(b.id)">
                    <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
                  </button>
                  <button v-if="canDelete" type="button" class="p-1 text-on-surface-variant hover:text-error" title="Hapus" @click="hapus(b)">
                    <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BankUjianFormModal v-model="formOpen" :bank-id="editId" @saved="muat" />
  </div>
</template>
