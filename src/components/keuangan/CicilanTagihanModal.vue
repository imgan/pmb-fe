<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { tagihanKuliahApi, type CicilanTagihanData } from '@/api/tagihanKuliah';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatCurrencyInputIdr, parseRupiahInput } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';
import type { StatusCicilan } from '@/types/entities';

/**
 * Atur cicilan bulanan satu tagihan: bagi rata otomatis lalu bisa diubah per baris (bulan, nominal,
 * jatuh tempo, No VA). Status per cicilan dihitung server dari total dibayar (cicilan awal dulu).
 */
// api: sumber cicilan; bawaan tagihan kuliah, tagihan wisuda memakai endpoint-nya sendiri.
const props = withDefaults(defineProps<{ tagihanId: number | null; canEdit: boolean; api?: Pick<typeof tagihanKuliahApi, 'getCicilan' | 'saveCicilan'> }>(), { api: () => tagihanKuliahApi });
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [] }>();

interface Baris {
  bulan: string; // YYYY-MM
  nominal: number | null;
  tanggalJatuhTempo: string;
  noVirtualAccount: string;
  // Hanya untuk tampilan (dari server, sebelum diubah).
  status?: StatusCicilan;
  dibayar?: number;
  terlambat?: boolean;
}

const data = ref<CicilanTagihanData | null>(null);
const baris = ref<Baris[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const diubah = ref(false);

// Pembagi otomatis.
const jumlahBulan = ref(6);
const bulanMulai = ref('');
const hariJatuhTempo = ref<number | null>(10);
const vaDefault = ref('');

const STATUS_LABEL: Record<StatusCicilan, string> = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum Bayar' };
const STATUS_VARIANT: Record<StatusCicilan, 'success' | 'warning' | 'danger'> = { LUNAS: 'success', SEBAGIAN: 'warning', BELUM_BAYAR: 'danger' };

const bulanIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const tambahBulan = (bulan: string, i: number) => {
  const [y, m] = bulan.split('-').map(Number);
  const d = new Date(y, m - 1 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const jatuhTempo = (bulan: string, hari: number | null) => {
  if (!hari) return '';
  const [y, m] = bulan.split('-').map(Number);
  return `${bulan}-${String(Math.min(hari, new Date(y, m, 0).getDate())).padStart(2, '0')}`;
};
const namaBulan = (periode: string) =>
  new Date(`${periode.slice(0, 7)}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

const load = async () => {
  if (!props.tagihanId) return;
  loading.value = true;
  error.value = null;
  try {
    data.value = await props.api.getCicilan(props.tagihanId);
    baris.value = data.value.cicilan.map((c) => ({
      bulan: c.periode.slice(0, 7),
      nominal: c.nominal,
      tanggalJatuhTempo: c.tanggalJatuhTempo ?? '',
      noVirtualAccount: c.noVirtualAccount ?? '',
      status: c.status,
      dibayar: c.dibayar,
      terlambat: c.terlambat,
    }));
    vaDefault.value = data.value.tagihan.noVirtualAccount ?? data.value.cicilan[0]?.noVirtualAccount ?? '';
    bulanMulai.value = data.value.cicilan[0]?.periode.slice(0, 7) ?? bulanIni();
    if (data.value.cicilan.length) jumlahBulan.value = data.value.cicilan.length;
    diubah.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat cicilan');
  } finally {
    loading.value = false;
  }
};

watch(open, (v) => {
  if (v) load();
});

const total = computed(() => data.value?.tagihan.totalTagihan ?? 0);
const jumlahNominal = computed(() => baris.value.reduce((s, b) => s + (b.nominal ?? 0), 0));
const selisih = computed(() => total.value - jumlahNominal.value);

const bagiRata = () => {
  const n = Math.min(Math.max(Math.floor(jumlahBulan.value) || 1, 1), 12);
  const per = Math.floor(total.value / n / 1000) * 1000;
  baris.value = Array.from({ length: n }, (_, i) => {
    const bulan = tambahBulan(bulanMulai.value || bulanIni(), i);
    return {
      bulan,
      nominal: i === n - 1 ? total.value - per * (n - 1) : per,
      tanggalJatuhTempo: jatuhTempo(bulan, hariJatuhTempo.value),
      noVirtualAccount: vaDefault.value.replace(/\D/g, ''),
    };
  });
  diubah.value = true;
};

const tambahBaris = () => {
  const terakhir = baris.value[baris.value.length - 1]?.bulan ?? tambahBulan(bulanMulai.value || bulanIni(), -1);
  const bulan = tambahBulan(terakhir, 1);
  baris.value.push({ bulan, nominal: Math.max(selisih.value, 0), tanggalJatuhTempo: jatuhTempo(bulan, hariJatuhTempo.value), noVirtualAccount: vaDefault.value });
  diubah.value = true;
};
const hapusBaris = (i: number) => {
  baris.value.splice(i, 1);
  diubah.value = true;
};
const tandaiUbah = () => {
  diubah.value = true;
};

const simpan = async (hapusSemua = false) => {
  if (!props.tagihanId) return;
  error.value = null;
  const rows = hapusSemua ? [] : baris.value;
  if (rows.some((b) => !b.bulan || b.nominal === null)) {
    error.value = 'Bulan dan nominal setiap cicilan wajib diisi';
    return;
  }
  if (rows.some((b) => b.noVirtualAccount && !/^[0-9]{1,30}$/.test(b.noVirtualAccount.replace(/[\s.-]/g, '')))) {
    error.value = 'No Virtual Account hanya boleh berisi angka (maks. 30 digit)';
    return;
  }
  if (rows.length && selisih.value !== 0) {
    error.value = `Jumlah cicilan ${formatCurrencyIdr(jumlahNominal.value)} belum sama dengan total tagihan ${formatCurrencyIdr(total.value)}`;
    return;
  }
  saving.value = true;
  try {
    await props.api.saveCicilan(
      props.tagihanId,
      rows.map((b) => ({
        periode: b.bulan,
        nominal: b.nominal ?? 0,
        tanggalJatuhTempo: b.tanggalJatuhTempo || null,
        noVirtualAccount: b.noVirtualAccount.replace(/[\s.-]/g, '') || null,
      }))
    );
    toastSuccess(hapusSemua ? 'Cicilan dihapus, tagihan dibayar sekaligus' : 'Cicilan disimpan');
    emit('saved');
    await load();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan cicilan');
  } finally {
    saving.value = false;
  }
};

const inputClass =
  'w-full px-2 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60';
</script>

<template>
  <Modal
    v-model="open"
    title="Cicilan Bulanan"
    :subtitle="data ? `${data.tagihan.mahasiswa.nim} — ${data.tagihan.mahasiswa.namaLengkap} ${data.tagihan.semester ? `· Semester ${data.tagihan.semester}` : ''} · ${data.tagihan.tahunAjaran ?? ''}` : ''"
    size="xl"
  >
    <div v-if="loading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat cicilan...</div>
    <div v-else-if="data" class="space-y-4">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm">
        <div class="rounded-lg border border-outline-variant p-3">
          <p class="text-on-surface-variant">Total Tagihan</p>
          <p class="font-semibold text-on-surface">{{ formatCurrencyIdr(data.tagihan.totalTagihan) }}</p>
        </div>
        <div class="rounded-lg border border-outline-variant p-3">
          <p class="text-on-surface-variant">Sudah Dibayar</p>
          <p class="font-semibold text-on-surface">{{ formatCurrencyIdr(data.tagihan.totalDibayar) }}</p>
        </div>
        <div class="rounded-lg border border-outline-variant p-3">
          <p class="text-on-surface-variant">Sisa</p>
          <p class="font-semibold" :class="data.tagihan.sisaTagihan > 0 ? 'text-error' : 'text-on-surface'">{{ formatCurrencyIdr(data.tagihan.sisaTagihan) }}</p>
        </div>
      </div>

      <div v-if="canEdit" class="rounded-lg border border-outline-variant p-3 bg-surface-bright">
        <p class="text-label-md font-medium text-on-surface mb-2">Bagi rata otomatis</p>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 items-end text-body-sm">
          <label class="block">
            <span class="block text-on-surface-variant mb-1">Jumlah bulan</span>
            <input v-model.number="jumlahBulan" type="number" min="1" max="12" :class="inputClass" />
          </label>
          <label class="block">
            <span class="block text-on-surface-variant mb-1">Mulai bulan</span>
            <input v-model="bulanMulai" type="month" :class="inputClass" />
          </label>
          <label class="block">
            <span class="block text-on-surface-variant mb-1">Jatuh tempo tiap tgl</span>
            <input v-model.number="hariJatuhTempo" type="number" min="1" max="31" :class="inputClass" />
          </label>
          <label class="block">
            <span class="block text-on-surface-variant mb-1">No VA</span>
            <input v-model="vaDefault" inputmode="numeric" placeholder="VA untuk semua cicilan" :class="inputClass" />
          </label>
          <AppButton variant="secondary" icon="calculate" @click="bagiRata">Bagi Rata</AppButton>
        </div>
        <p class="mt-2 text-label-sm text-on-surface-variant">Nominal dibulatkan ke ribuan; selisih pembulatan masuk ke cicilan terakhir.</p>
      </div>

      <div v-if="!baris.length" class="py-6 text-center text-body-sm text-on-surface-variant">
        Tagihan ini belum dicicil (dibayar sekaligus).<template v-if="canEdit"> Gunakan "Bagi Rata" untuk membuat cicilan.</template>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th class="px-2 py-2 text-left font-medium w-10">Ke</th>
              <th class="px-2 py-2 text-left font-medium">Bulan</th>
              <th class="px-2 py-2 text-left font-medium">Nominal</th>
              <th class="px-2 py-2 text-left font-medium">Jatuh Tempo</th>
              <th class="px-2 py-2 text-left font-medium">No Virtual Account</th>
              <th class="px-2 py-2 text-center font-medium">Status</th>
              <th v-if="canEdit" class="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="(b, i) in baris" :key="i">
              <td class="px-2 py-2 text-on-surface-variant">{{ i + 1 }}</td>
              <td class="px-2 py-2 min-w-36">
                <input v-if="canEdit" v-model="b.bulan" type="month" :class="inputClass" @input="tandaiUbah" />
                <span v-else>{{ namaBulan(b.bulan) }}</span>
              </td>
              <td class="px-2 py-2 min-w-36">
                <input
                  v-if="canEdit"
                  :value="formatCurrencyInputIdr(b.nominal)"
                  inputmode="numeric"
                  :class="inputClass"
                  @input="b.nominal = parseRupiahInput(($event.target as HTMLInputElement).value); tandaiUbah()"
                />
                <span v-else>{{ formatCurrencyIdr(b.nominal) }}</span>
              </td>
              <td class="px-2 py-2 min-w-36">
                <input v-if="canEdit" v-model="b.tanggalJatuhTempo" type="date" :class="inputClass" @input="tandaiUbah" />
                <span v-else>{{ b.tanggalJatuhTempo || '-' }}</span>
              </td>
              <td class="px-2 py-2 min-w-44">
                <input v-if="canEdit" v-model="b.noVirtualAccount" inputmode="numeric" :class="inputClass" @input="tandaiUbah" />
                <span v-else class="tabular-nums">{{ b.noVirtualAccount || '-' }}</span>
              </td>
              <td class="px-2 py-2 text-center whitespace-nowrap">
                <template v-if="b.status && !diubah">
                  <StatusBadge :label="STATUS_LABEL[b.status]" :variant="STATUS_VARIANT[b.status]" />
                  <span v-if="b.terlambat" class="block text-label-sm text-error mt-0.5">Lewat jatuh tempo</span>
                </template>
                <span v-else class="text-on-surface-variant">-</span>
              </td>
              <td v-if="canEdit" class="px-2 py-2 text-center">
                <button type="button" class="text-on-surface-variant hover:text-error" title="Hapus baris" @click="hapusBaris(i)">
                  <span class="material-symbols-outlined" style="font-size: 18px">close</span>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-outline-variant text-body-sm">
            <tr>
              <td colspan="2" class="px-2 py-2 font-medium">Jumlah</td>
              <td class="px-2 py-2 font-semibold" :class="selisih !== 0 ? 'text-error' : 'text-on-surface'">
                {{ formatCurrencyIdr(jumlahNominal) }}
                <span v-if="selisih !== 0" class="block text-label-sm font-normal">
                  {{ selisih > 0 ? 'Kurang' : 'Lebih' }} {{ formatCurrencyIdr(Math.abs(selisih)) }} dari total tagihan
                </span>
              </td>
              <td :colspan="canEdit ? 4 : 3"></td>
            </tr>
          </tfoot>
        </table>
        <button v-if="canEdit" type="button" class="mt-2 text-label-md text-primary hover:underline" @click="tambahBaris">+ Tambah cicilan</button>
      </div>
      <p class="text-label-sm text-on-surface-variant">
        Pembayaran (kasir maupun import) otomatis melunasi cicilan paling awal lebih dulu.
      </p>
    </div>

    <template #footer>
      <AppButton
        v-if="canEdit && data?.cicilan.length"
        variant="secondary"
        class="mr-auto"
        :disabled="saving"
        @click="simpan(true)"
      >
        Hapus Cicilan
      </AppButton>
      <AppButton variant="secondary" @click="open = false">Tutup</AppButton>
      <AppButton v-if="canEdit" :disabled="saving || !baris.length" @click="simpan()">{{ saving ? 'Menyimpan...' : 'Simpan Cicilan' }}</AppButton>
    </template>
  </Modal>
</template>
