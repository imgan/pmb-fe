<script setup lang="ts">
import { onMounted, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  mahasiswaPembayaranApi,
  type RiwayatPembayaran,
  type StatusTagihanKuliah,
} from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

const STATUS_LABEL: Record<StatusTagihanKuliah, string> = { LUNAS: 'Lunas', BELUM_LUNAS: 'Belum Lunas', BELUM_BAYAR: 'Belum Dibayar' };
const STATUS_VARIANT: Record<StatusTagihanKuliah, 'success' | 'warning' | 'danger'> = {
  LUNAS: 'success',
  BELUM_LUNAS: 'warning',
  BELUM_BAYAR: 'danger',
};

const data = ref<RiwayatPembayaran | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const expanded = ref<Set<number>>(new Set());
const printingId = ref<number | null>(null);

onMounted(async () => {
  try {
    data.value = await mahasiswaPembayaranApi.list();
    // Semester terbaru dibuka otomatis.
    if (data.value.tagihan[0]) expanded.value = new Set([data.value.tagihan[0].id]);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat riwayat pembayaran');
  } finally {
    loading.value = false;
  }
});

const toggle = (id: number) => {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
};

const vaTersalin = ref(false);
const salinVa = async (va: string) => {
  try {
    await navigator.clipboard.writeText(va);
    vaTersalin.value = true;
    setTimeout(() => (vaTersalin.value = false), 2000);
  } catch {
    toastError('Gagal menyalin nomor VA');
  }
};

const namaBulan = (periode: string) =>
  new Date(`${periode.slice(0, 7)}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

const cetakKwitansi = async (pembayaranId: number) => {
  printingId.value = pembayaranId;
  try {
    openBlob(await mahasiswaPembayaranApi.kwitansiPdf(pembayaranId));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka kwitansi'));
  } finally {
    printingId.value = null;
  }
};
</script>

<template>
  <div>
    <header class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Pembayaran Kuliah</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Riwayat tagihan dan pembayaran kuliah per semester, serta cetak kwitansi.</p>
      </div>
      <!-- Kartu No VA selalu tampil; bila keuangan belum mengisi VA, tampil keterangan belum tersedia. -->
      <div
        v-if="data && !data.ringkasan.noVirtualAccount"
        class="px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest flex items-center gap-3 md:min-w-[22rem]"
      >
        <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 28px">account_balance</span>
        <div class="flex-1 min-w-0">
          <p class="text-label-sm text-on-surface-variant">No Virtual Account</p>
          <p class="text-body-md font-medium text-on-surface-variant">Belum tersedia</p>
          <p class="text-label-sm text-on-surface-variant">Hubungi bagian keuangan untuk nomor VA pembayaran.</p>
        </div>
      </div>
      <div
        v-else-if="data?.ringkasan.noVirtualAccount"
        class="px-4 py-3 rounded-lg border border-primary bg-surface-container-lowest flex items-center gap-3 md:min-w-[22rem]"
      >
        <span class="material-symbols-outlined text-primary" style="font-size: 28px">account_balance</span>
        <div class="flex-1 min-w-0">
          <p class="text-label-sm text-on-surface-variant">No Virtual Account</p>
          <p class="text-title-lg font-semibold text-on-surface tabular-nums tracking-wide break-all">{{ data.ringkasan.noVirtualAccount }}</p>
          <p v-if="data.ringkasan.vaAktif" class="text-label-sm text-on-surface-variant">
            {{ data.ringkasan.vaAktif.status === 'AKAN_DATANG' ? 'Dibuka' : 'Berlaku' }}
            {{ formatDate(data.ringkasan.vaAktif.periodeOpen) }} – {{ formatDate(data.ringkasan.vaAktif.periodeClose) }}
            <template v-if="data.ringkasan.vaAktif.nominal > 0">
              · {{ formatCurrencyIdr(data.ringkasan.vaAktif.nominal) }}
            </template>
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-label-md text-primary hover:underline shrink-0"
          @click="salinVa(data.ringkasan.noVirtualAccount)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">{{ vaTersalin ? 'check' : 'content_copy' }}</span>
          {{ vaTersalin ? 'Tersalin' : 'Salin' }}
        </button>
      </div>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

    <template v-else-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div class="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest">
          <p class="text-label-sm text-on-surface-variant">Tagihan Semester Ini</p>
          <p class="text-title-lg font-semibold text-on-surface">{{ formatCurrencyIdr(data.ringkasan.totalTagihan) }}</p>
        </div>
        <div class="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest">
          <p class="text-label-sm text-on-surface-variant">Dibayar</p>
          <p class="text-title-lg font-semibold text-success">{{ formatCurrencyIdr(data.ringkasan.totalDibayar) }}</p>
        </div>
        <div class="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest">
          <p class="text-label-sm text-on-surface-variant">Sisa Semester Ini</p>
          <p class="text-title-lg font-semibold" :class="data.ringkasan.sisaTagihan > 0 ? 'text-error' : 'text-success'">
            {{ formatCurrencyIdr(data.ringkasan.sisaTagihan) }}
          </p>
        </div>
        <div class="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest">
          <p class="text-label-sm text-on-surface-variant">Tunggakan Sebelumnya</p>
          <p class="text-title-lg font-semibold" :class="data.ringkasan.tunggakan > 0 ? 'text-error' : 'text-on-surface'">
            {{ formatCurrencyIdr(data.ringkasan.tunggakan) }}
          </p>
        </div>
      </div>
      <p v-if="data.tagihan.length" class="mb-6 text-body-md text-on-surface">
        Total yang harus dilunasi:
        <strong :class="data.ringkasan.totalKewajiban > 0 ? 'text-error' : 'text-success'">
          {{ data.ringkasan.totalKewajiban > 0 ? formatCurrencyIdr(data.ringkasan.totalKewajiban) : 'Lunas' }}
        </strong>
      </p>

      <p
        v-if="!data.tagihan.length"
        class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg"
      >
        Belum ada tagihan kuliah.
      </p>

      <section
        v-for="t in data.tagihan"
        :key="t.id"
        class="mb-4 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
      >
        <button
          type="button"
          class="w-full px-4 py-3 bg-primary text-on-primary flex items-center justify-between gap-3 text-left"
          @click="toggle(t.id)"
        >
          <span class="text-label-md font-medium">
            Semester {{ t.semester }}<span v-if="t.tahunAjaran"> &middot; {{ t.tahunAjaran }}</span>
          </span>
          <span class="flex items-center gap-3">
            <StatusBadge :label="STATUS_LABEL[t.status]" :variant="STATUS_VARIANT[t.status]" />
            <span class="material-symbols-outlined" style="font-size: 20px">{{ expanded.has(t.id) ? 'expand_less' : 'expand_more' }}</span>
          </span>
        </button>

        <div class="px-4 py-3 grid grid-cols-3 gap-2 text-body-sm border-b border-outline-variant">
          <div>
            <p class="text-label-sm text-on-surface-variant">Tagihan</p>
            <p class="font-medium text-on-surface">{{ formatCurrencyIdr(t.totalTagihan) }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant">Dibayar</p>
            <p class="font-medium text-success">{{ formatCurrencyIdr(t.totalDibayar) }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant">Sisa</p>
            <p class="font-medium" :class="t.sisaTagihan > 0 ? 'text-error' : 'text-success'">{{ formatCurrencyIdr(t.sisaTagihan) }}</p>
          </div>
        </div>

        <div v-if="expanded.has(t.id)" class="px-4 py-3 space-y-4">
          <div class="text-body-sm space-y-1">
            <div class="flex justify-between font-semibold text-on-surface">
              <span>Total Tagihan</span>
              <span>{{ formatCurrencyIdr(t.totalTagihan) }}</span>
            </div>
            <div v-if="t.tunggakan > 0" class="flex justify-between text-error">
              <span>Tunggakan semester sebelumnya</span>
              <span>{{ formatCurrencyIdr(t.tunggakan) }}</span>
            </div>
            <div v-if="t.tanggalJatuhTempo" class="flex justify-between text-on-surface-variant">
              <span>Jatuh tempo</span>
              <span>{{ formatDate(t.tanggalJatuhTempo) }}</span>
            </div>
            <div v-if="t.noVirtualAccount" class="flex justify-between text-on-surface-variant">
              <span>No Virtual Account</span>
              <span class="tabular-nums">{{ t.noVirtualAccount }}</span>
            </div>
            <div v-if="t.dibayarImport > 0" class="flex justify-between text-on-surface-variant">
              <span>Pembayaran tercatat bagian keuangan</span>
              <span>{{ formatCurrencyIdr(t.dibayarImport) }}</span>
            </div>
          </div>

          <div v-if="t.cicilan.length">
            <p class="text-label-md font-medium text-on-surface mb-1">Cicilan Bulanan</p>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-body-sm">
                <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
                  <tr>
                    <th class="py-2 pr-3 font-medium">Ke</th>
                    <th class="py-2 pr-3 font-medium">Bulan</th>
                    <th class="py-2 pr-3 font-medium text-right">Nominal</th>
                    <th class="py-2 pr-3 font-medium">Jatuh Tempo</th>
                    <th class="py-2 pr-3 font-medium">No Virtual Account</th>
                    <th class="py-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant">
                  <tr v-for="c in t.cicilan" :key="c.cicilanKe">
                    <td class="py-2 pr-3">{{ c.cicilanKe }}</td>
                    <td class="py-2 pr-3 whitespace-nowrap">{{ namaBulan(c.periode) }}</td>
                    <td class="py-2 pr-3 text-right whitespace-nowrap">
                      {{ formatCurrencyIdr(c.nominal) }}
                      <span v-if="c.status === 'BELUM_LUNAS'" class="block text-label-sm text-on-surface-variant">sisa {{ formatCurrencyIdr(c.sisa) }}</span>
                    </td>
                    <td class="py-2 pr-3 whitespace-nowrap" :class="c.terlambat ? 'text-error font-medium' : ''">
                      {{ c.tanggalJatuhTempo ? formatDate(c.tanggalJatuhTempo) : '-' }}
                    </td>
                    <td class="py-2 pr-3">
                      <button
                        v-if="c.noVirtualAccount"
                        type="button"
                        class="tabular-nums hover:text-primary"
                        title="Salin No VA"
                        @click="salinVa(c.noVirtualAccount)"
                      >
                        {{ c.noVirtualAccount }}
                      </button>
                      <span v-else class="text-on-surface-variant">-</span>
                    </td>
                    <td class="py-2 text-center"><StatusBadge :label="STATUS_LABEL[c.status]" :variant="STATUS_VARIANT[c.status]" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="mt-1 text-label-sm text-on-surface-variant">Pembayaran otomatis melunasi cicilan paling awal lebih dulu.</p>
          </div>

          <div>
            <p class="text-label-md font-medium text-on-surface mb-1">Riwayat Pembayaran</p>
            <div v-if="t.pembayaran.length" class="overflow-x-auto">
              <table class="w-full text-left text-body-sm">
                <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
                  <tr>
                    <th class="py-2 pr-3 font-medium">Tanggal</th>
                    <th class="py-2 pr-3 font-medium">No. Kwitansi</th>
                    <th class="py-2 pr-3 font-medium">Bank / No. Bukti</th>
                    <th class="py-2 pr-3 font-medium text-right">Nominal</th>
                    <th class="py-2 font-medium text-right">Kwitansi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant">
                  <tr v-for="p in t.pembayaran" :key="p.id">
                    <td class="py-2 pr-3 whitespace-nowrap">{{ formatDate(p.tanggalBayar) }}</td>
                    <td class="py-2 pr-3 whitespace-nowrap">{{ p.nomorKwitansi }}</td>
                    <td class="py-2 pr-3">
                      {{ [p.kodeBank, p.noBukti].filter(Boolean).join(' / ') || '-' }}
                      <span v-if="p.keterangan" class="block text-label-sm text-on-surface-variant">{{ p.keterangan }}</span>
                    </td>
                    <td class="py-2 pr-3 text-right whitespace-nowrap font-medium">{{ formatCurrencyIdr(p.nominal) }}</td>
                    <td class="py-2 text-right">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 text-label-md text-primary hover:underline disabled:opacity-60"
                        :disabled="printingId === p.id"
                        @click="cetakKwitansi(p.id)"
                      >
                        <span class="material-symbols-outlined" style="font-size: 18px">print</span>
                        {{ printingId === p.id ? 'Membuka...' : 'Cetak' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-body-sm text-on-surface-variant">Belum ada pembayaran untuk semester ini.</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
