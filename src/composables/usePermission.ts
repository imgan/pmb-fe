import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import type { MenuCode } from '@/constants/menuCodes';

export function usePermission(menuCode: MenuCode | string) {
  const authStore = useAuthStore();

  const flags = computed(() => authStore.permissionsFor(menuCode));

  return {
    canCreate: computed(() => flags.value.canCreate),
    canRead: computed(() => flags.value.canRead),
    canUpdate: computed(() => flags.value.canUpdate),
    canDelete: computed(() => flags.value.canDelete),
  };
}
