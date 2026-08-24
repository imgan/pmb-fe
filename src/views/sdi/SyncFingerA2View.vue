<script setup lang="ts">
import SyncFingerPanel from '@/components/sdi/SyncFingerPanel.vue';
import { MENU } from '@/constants/menuCodes';
</script>

<template>
  <SyncFingerPanel mesin="A2" :menu-code="MENU.SYNC_FINGER_A2_MANAGEMENT" title="Sync Finger A2" />
</template>
