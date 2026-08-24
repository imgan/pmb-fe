<script setup lang="ts">
import SyncFingerPanel from '@/components/sdi/SyncFingerPanel.vue';
import { MENU } from '@/constants/menuCodes';
</script>

<template>
  <SyncFingerPanel mesin="A1" :menu-code="MENU.SYNC_FINGER_A1_MANAGEMENT" title="Sync Finger A1" />
</template>
