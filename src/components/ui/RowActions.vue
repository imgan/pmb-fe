<script setup lang="ts">
withDefaults(
  defineProps<{
    showView?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  }>(),
  { showView: false, canUpdate: true, canDelete: true }
);

const emit = defineEmits<{ view: []; edit: []; delete: [] }>();
</script>

<template>
  <button v-if="showView" type="button" class="text-on-surface-variant hover:text-primary transition-colors" title="Lihat" @click="emit('view')">
    <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
  </button>
  <button v-if="canUpdate" type="button" class="text-on-surface-variant hover:text-primary transition-colors" title="Ubah" @click="emit('edit')">
    <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
  </button>
  <button v-if="canDelete" type="button" class="text-on-surface-variant hover:text-error transition-colors" title="Hapus" @click="emit('delete')">
    <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
  </button>
</template>
