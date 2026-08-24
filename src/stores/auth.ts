import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import { tokenStorage } from '@/api/http';
import type { User, RoleMenuPermission } from '@/types/entities';
import type { MenuCode } from '@/constants/menuCodes';

export interface PermissionFlags {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const EMPTY_PERMISSION: PermissionFlags = {
  canCreate: false,
  canRead: false,
  canUpdate: false,
  canDelete: false,
};

interface AuthState {
  user: User | null;
  permissions: RoleMenuPermission[];
  ready: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    permissions: [],
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    permissionMap(state): Record<string, PermissionFlags> {
      const map: Record<string, PermissionFlags> = {};
      for (const perm of state.permissions) {
        const code = perm.menu?.code;
        if (!code) continue;
        map[code] = {
          canCreate: perm.canCreate,
          canRead: perm.canRead,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
        };
      }
      return map;
    },
  },

  actions: {
    permissionsFor(menuCode: MenuCode | string): PermissionFlags {
      return this.permissionMap[menuCode] ?? EMPTY_PERMISSION;
    },

    async loadProfile() {
      const { user, permissions } = await authApi.me();
      this.user = user;
      this.permissions = permissions;
    },

    setUser(user: User) {
      this.user = user;
    },

    async bootstrap() {
      if (tokenStorage.getAccessToken()) {
        try {
          await this.loadProfile();
        } catch {
          tokenStorage.clear();
          this.user = null;
          this.permissions = [];
        }
      }
      this.ready = true;
    },

    async login(username: string, password: string) {
      const result = await authApi.login(username, password);
      tokenStorage.setTokens(result.accessToken, result.refreshToken);
      await this.loadProfile();
    },

    logout() {
      tokenStorage.clear();
      this.user = null;
      this.permissions = [];
    },
  },
});
