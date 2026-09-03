<script setup lang="ts" generic="T extends { id: number }">
export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

withDefaults(
  defineProps<{
    columns: DataTableColumn[];
    items: T[];
    loading?: boolean;
    emptyMessage?: string;
    showActions?: boolean;
    actionsAlign?: 'left' | 'right' | 'center';
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc';
  }>(),
  { loading: false, emptyMessage: 'Tidak ada data', showActions: true, actionsAlign: 'right', sortKey: null, sortDir: 'asc' }
);

const emit = defineEmits<{ sort: [key: string] }>();

const alignClass = (align?: 'left' | 'right' | 'center') =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

const justifyClass = (align?: 'left' | 'right' | 'center') =>
  align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

const handleSort = (col: DataTableColumn) => {
  if (col.sortable) emit('sort', col.key);
};
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead class="bg-[#F1F5F9] border-b border-outline-variant">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="p-4 font-semibold text-label-md text-primary"
            :class="[alignClass(col.align), col.sortable ? 'cursor-pointer select-none hover:text-primary/80' : '']"
            @click="handleSort(col)"
          >
            <span class="inline-flex items-center gap-1" :class="justifyClass(col.align)">
              {{ col.label }}
              <span
                v-if="col.sortable"
                class="material-symbols-outlined transition-opacity"
                style="font-size: 16px"
                :class="sortKey === col.key ? 'opacity-100' : 'opacity-30'"
              >
                {{ sortKey === col.key && sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
              </span>
            </span>
          </th>
          <th v-if="showActions" class="p-4 font-semibold text-label-md text-primary" :class="alignClass(actionsAlign)">
            Aksi
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
        <tr v-if="loading">
          <td :colspan="columns.length + (showActions ? 1 : 0)" class="p-8 text-center text-on-surface-variant">
            Memuat data...
          </td>
        </tr>
        <tr v-else-if="items.length === 0">
          <td :colspan="columns.length + (showActions ? 1 : 0)" class="p-8 text-center text-on-surface-variant">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr v-for="item in items" v-else :key="item.id" class="hover:bg-surface-container transition-colors group">
          <td v-for="col in columns" :key="col.key" class="p-4" :class="alignClass(col.align)">
            <slot :name="`cell-${col.key}`" :item="item">
              {{ (item as Record<string, unknown>)[col.key] }}
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
