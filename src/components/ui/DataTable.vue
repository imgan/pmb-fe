<script setup lang="ts" generic="T extends { id: number }">
export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  /**
   * true = diurutkan server (halaman memasang @sort). Kolom lain otomatis bisa diurutkan di browser
   * (data di halaman ini saja) berdasarkan teks yang tampil; false = tidak bisa diurutkan sama sekali.
   */
  sortable?: boolean;
  /**
   * Judul grup header: kolom BERURUTAN dengan group yang sama ditampilkan di bawah satu judul (header
   * dua baris, mis. "Mata Kuliah" → OBE | Non OBE). Kolom tanpa group memakai rowspan 2.
   */
  group?: string;
}

import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[];
    items: T[];
    loading?: boolean;
    emptyMessage?: string;
    showActions?: boolean;
    actionsAlign?: 'left' | 'right' | 'center';
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc';
    /** Tampilkan kolom checkbox (pakai bersama v-model:selected-ids). */
    selectable?: boolean;
    selectedIds?: number[];
    /** Baris yang boleh dicentang; default semua. */
    isSelectable?: (item: T) => boolean;
  }>(),
  {
    loading: false,
    emptyMessage: 'Tidak ada data',
    showActions: true,
    actionsAlign: 'right',
    sortKey: null,
    sortDir: 'asc',
    selectable: false,
    selectedIds: () => [],
    isSelectable: () => true,
  }
);

const emit = defineEmits<{ sort: [key: string]; 'update:selectedIds': [ids: number[]] }>();

/** Baris header atas bila ada kolom ber-group: urutan sel { col } (rowspan 2) atau { group, span }. */
const hasGroups = computed(() => props.columns.some((c) => c.group));
const headerTop = computed(() => {
  const cells: ({ type: 'col'; col: DataTableColumn } | { type: 'group'; label: string; span: number; key: string })[] = [];
  props.columns.forEach((col, i) => {
    const prev = cells[cells.length - 1];
    if (!col.group) cells.push({ type: 'col', col });
    else if (prev?.type === 'group' && prev.label === col.group) prev.span += 1;
    else cells.push({ type: 'group', label: col.group, span: 1, key: `group-${i}-${col.group}` });
  });
  return cells;
});
const groupedColumns = computed(() => props.columns.filter((c) => c.group));

const colspan = computed(() => props.columns.length + (props.showActions ? 1 : 0) + (props.selectable ? 1 : 0));
const selectableIds = computed(() => props.items.filter((i) => props.isSelectable(i)).map((i) => i.id));
const allSelected = computed(() => selectableIds.value.length > 0 && selectableIds.value.every((id) => props.selectedIds.includes(id)));
const toggleAll = () => {
  const others = props.selectedIds.filter((id) => !selectableIds.value.includes(id));
  emit('update:selectedIds', allSelected.value ? others : [...others, ...selectableIds.value]);
};
const toggleOne = (id: number) => {
  emit('update:selectedIds', props.selectedIds.includes(id) ? props.selectedIds.filter((x) => x !== id) : [...props.selectedIds, id]);
};

const alignClass = (align?: 'left' | 'right' | 'center') =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

const justifyClass = (align?: 'left' | 'right' | 'center') =>
  align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

// ---- Sorting ----
// Server: kolom sortable:true pada halaman yang mendengarkan @sort (urutan seluruh data). Kolom lain
// diurutkan di browser memakai teks sel yang tampil (hasil slot), jadi rupiah/tanggal/nama nested
// ikut benar; hanya mengurutkan baris yang sedang tampil (halaman ini).
const instance = getCurrentInstance();
const hasServerSort = computed(() => !!instance?.vnode.props?.onSort);
const NON_SORTABLE_KEYS = new Set(['no', 'aksi', 'actions', 'action']);
const isServerSortable = (col: DataTableColumn) => !!col.sortable && hasServerSort.value;
const isClientSortable = (col: DataTableColumn) =>
  !isServerSortable(col) && col.sortable !== false && !NON_SORTABLE_KEYS.has(col.key.toLowerCase());
const isSortable = (col: DataTableColumn) => isServerSortable(col) || isClientSortable(col);

const localKey = ref<string | null>(null);
const localDir = ref<'asc' | 'desc'>('asc');
const cellText = ref<Map<number, string>>(new Map());
const tbodyRef = ref<HTMLElement | null>(null);

const BULAN: Record<string, number> = {
  jan: 1, feb: 2, peb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8,
  sep: 9, okt: 10, oct: 10, nov: 11, nop: 11, des: 12, dec: 12,
};

/** Nilai pembanding: angka (rupiah / angka id-ID / persen), tanggal ("11 Okt 2026", dd/mm/yyyy, ISO), atau teks. */
const toComparable = (text: string): number | string => {
  const t = text.trim();
  if (!t || t === '-') return '';
  const negatif = /^-/.test(t);
  const angka = t.replace(/^-?\s*rp\.?\s*/i, '').replace(/%$/, '');
  if (/^[\d.]+(,\d+)?$/.test(angka)) {
    const n = Number(angka.replace(/\./g, '').replace(',', '.'));
    return negatif ? -n : n;
  }
  let m = t.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/i);
  if (m && BULAN[m[2].toLowerCase()]) return Number(m[3]) * 10000 + BULAN[m[2].toLowerCase()] * 100 + Number(m[1]);
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
  return t.toLowerCase();
};

const readCellTexts = () => {
  const key = localKey.value;
  if (!key || !tbodyRef.value) return;
  const colIndex = props.columns.findIndex((c) => c.key === key) + (props.selectable ? 1 : 0);
  const map = new Map<number, string>();
  tbodyRef.value.querySelectorAll<HTMLTableRowElement>('tr[data-row-id]').forEach((tr) => {
    map.set(Number(tr.dataset.rowId), tr.cells[colIndex]?.textContent ?? '');
  });
  cellText.value = map;
};

const sortValue = (item: T): number | string => {
  const raw = (item as Record<string, unknown>)[localKey.value as string];
  if (typeof raw === 'number') return raw;
  const text = cellText.value.get(item.id);
  if (text !== undefined) return toComparable(text);
  return typeof raw === 'string' ? toComparable(raw) : '';
};

const displayItems = computed(() => {
  if (!localKey.value) return props.items;
  const dir = localDir.value === 'asc' ? 1 : -1;
  return props.items
    .map((item, i) => ({ item, i, v: sortValue(item) }))
    .sort((a, b) => {
      // Nilai kosong selalu di bawah.
      if (a.v === '' && b.v !== '') return 1;
      if (b.v === '' && a.v !== '') return -1;
      const cmp =
        typeof a.v === 'number' && typeof b.v === 'number'
          ? a.v - b.v
          : String(a.v).localeCompare(String(b.v), 'id', { numeric: true, sensitivity: 'base' });
      return cmp * dir || a.i - b.i;
    })
    .map((x) => x.item);
});

// Kolom "No" tetap berurutan sesuai posisi tampil (memakai nomor asli halaman ini, mis. 11..20).
const nomorUrut = computed(() =>
  props.items
    .map((i) => (i as Record<string, unknown>).no)
    .filter((n): n is number => typeof n === 'number')
    .sort((a, b) => a - b)
);
const cellValue = (item: T, key: string, index: number) => {
  if (key === 'no' && localKey.value && nomorUrut.value.length === props.items.length) return nomorUrut.value[index];
  return (item as Record<string, unknown>)[key];
};

// Data baru (ganti halaman/filter/cari): baca ulang teks sel lalu urutkan lagi.
watch(
  () => props.items,
  async () => {
    if (!localKey.value) return;
    cellText.value = new Map();
    await nextTick();
    readCellTexts();
  }
);

const activeKey = computed(() => localKey.value ?? props.sortKey);
const activeDir = computed(() => (localKey.value ? localDir.value : props.sortDir));

const handleSort = async (col: DataTableColumn) => {
  if (isServerSortable(col)) {
    localKey.value = null;
    emit('sort', col.key);
    return;
  }
  if (!isClientSortable(col)) return;
  if (localKey.value === col.key) {
    // asc -> desc -> kembali ke urutan asli
    if (localDir.value === 'asc') localDir.value = 'desc';
    else localKey.value = null;
    return;
  }
  localKey.value = col.key;
  localDir.value = 'asc';
  cellText.value = new Map();
  await nextTick();
  readCellTexts();
};
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead class="bg-[#F1F5F9] border-b border-outline-variant">
        <!-- Header dua baris bila ada kolom ber-group -->
        <template v-if="hasGroups">
          <tr>
            <th v-if="selectable" rowspan="2" class="p-4 w-10">
              <input type="checkbox" aria-label="Pilih semua" :checked="allSelected" :disabled="!selectableIds.length" @change="toggleAll" />
            </th>
            <template v-for="cell in headerTop" :key="cell.type === 'col' ? cell.col.key : cell.key">
              <th
                v-if="cell.type === 'col'"
                rowspan="2"
                class="p-4 font-semibold text-label-md text-primary"
                :class="[alignClass(cell.col.align), isSortable(cell.col) ? 'cursor-pointer select-none hover:text-primary/80' : '']"
                @click="handleSort(cell.col)"
              >
                <span class="inline-flex items-center gap-1" :class="justifyClass(cell.col.align)">
                  {{ cell.col.label }}
                  <span
                    v-if="isSortable(cell.col)"
                    class="material-symbols-outlined transition-opacity"
                    style="font-size: 16px"
                    :class="activeKey === cell.col.key ? 'opacity-100' : 'opacity-30'"
                  >
                    {{ activeKey === cell.col.key && activeDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
                  </span>
                </span>
              </th>
              <th
                v-else
                :colspan="cell.span"
                class="px-4 pt-3 pb-2 font-semibold text-label-md text-primary text-center border-b border-outline-variant"
              >
                {{ cell.label }}
              </th>
            </template>
            <th v-if="showActions" rowspan="2" class="p-4 font-semibold text-label-md text-primary" :class="alignClass(actionsAlign)">Aksi</th>
          </tr>
          <tr>
            <th
              v-for="col in groupedColumns"
              :key="col.key"
              class="px-4 pt-2 pb-3 font-semibold text-label-md text-primary border-l border-outline-variant first:border-l-0"
              :class="[alignClass(col.align), isSortable(col) ? 'cursor-pointer select-none hover:text-primary/80' : '']"
              @click="handleSort(col)"
            >
              <span class="inline-flex items-center gap-1" :class="justifyClass(col.align)">
                {{ col.label }}
                <span
                  v-if="isSortable(col)"
                  class="material-symbols-outlined transition-opacity"
                  style="font-size: 16px"
                  :class="activeKey === col.key ? 'opacity-100' : 'opacity-30'"
                >
                  {{ activeKey === col.key && activeDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
                </span>
              </span>
            </th>
          </tr>
        </template>
        <tr v-else>
          <th v-if="selectable" class="p-4 w-10">
            <input
              type="checkbox"
              aria-label="Pilih semua"
              :checked="allSelected"
              :disabled="!selectableIds.length"
              @change="toggleAll"
            />
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            class="p-4 font-semibold text-label-md text-primary"
            :class="[alignClass(col.align), isSortable(col) ? 'cursor-pointer select-none hover:text-primary/80' : '']"
            @click="handleSort(col)"
          >
            <span class="inline-flex items-center gap-1" :class="justifyClass(col.align)">
              {{ col.label }}
              <span
                v-if="isSortable(col)"
                class="material-symbols-outlined transition-opacity"
                style="font-size: 16px"
                :class="activeKey === col.key ? 'opacity-100' : 'opacity-30'"
              >
                {{ activeKey === col.key && activeDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
              </span>
            </span>
          </th>
          <th v-if="showActions" class="p-4 font-semibold text-label-md text-primary" :class="alignClass(actionsAlign)">
            Aksi
          </th>
        </tr>
      </thead>
      <tbody ref="tbodyRef" class="divide-y divide-outline-variant text-body-sm text-on-surface">
        <tr v-if="loading">
          <td :colspan="colspan" class="p-8 text-center text-on-surface-variant">
            Memuat data...
          </td>
        </tr>
        <tr v-else-if="items.length === 0">
          <td :colspan="colspan" class="p-8 text-center text-on-surface-variant">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr
          v-for="(item, rowIndex) in displayItems"
          v-else
          :key="item.id"
          :data-row-id="item.id"
          class="hover:bg-surface-container transition-colors group"
        >
          <td v-if="selectable" class="p-4 w-10">
            <input
              v-if="isSelectable(item)"
              type="checkbox"
              aria-label="Pilih baris"
              :checked="selectedIds.includes(item.id)"
              @change="toggleOne(item.id)"
            />
          </td>
          <td v-for="col in columns" :key="col.key" class="p-4" :class="alignClass(col.align)">
            <slot :name="`cell-${col.key}`" :item="item">
              {{ cellValue(item, col.key, rowIndex) }}
            </slot>
          </td>
          <td v-if="showActions" class="p-4" :class="alignClass(actionsAlign)">
            <div class="flex gap-3" :class="justifyClass(actionsAlign)">
              <slot name="actions" :item="item" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
