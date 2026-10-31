import { defineStore } from 'pinia';
import { authApi, type LoginContextPayload } from '@/api/auth';
import { academicContextStorage, staffModuleStorage, tokenStorage } from '@/api/http';
import type { AcademicContext, User, RoleMenuPermission } from '@/types/entities';
import type { MenuCode } from '@/constants/menuCodes';
import { useMenuStore } from '@/stores/menu';

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
  context: AcademicContext;
}

const EMPTY_CONTEXT: AcademicContext = { tahunAkademik: null, prodi: null };

// Role yang boleh membuka semua prodi di modul Prodi (selaras dengan backend academicContext.service).
export const PRODI_ALL_ROLES = ['SUPERADMIN', 'ADMIN', 'DIREKTUR', 'WADIR', 'PT'];

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    permissions: [],
    ready: false,
    context: academicContextStorage.get<AcademicContext>() ?? { ...EMPTY_CONTEXT },
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    /** Akun ber-role PRODI terkunci ke prodinya sendiri. */
    isProdiScoped: (state) => state.user?.role?.code === 'PRODI',
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

    setContext(context: AcademicContext) {
      this.context = context;
      academicContextStorage.set(context);
    },

    async login(username: string, password: string, context: LoginContextPayload = {}) {
      const result = await authApi.login(username, password, context);
      // Ganti akun (mis. dari Prodi ke Keuangan) tanpa logout: buang sisa sesi lama dulu supaya
      // hak akses & sidebar akun sebelumnya tidak ikut terbawa.
      this.user = null;
      this.permissions = [];
      useMenuStore().reset();
      tokenStorage.setTokens(result.accessToken, result.refreshToken);
      if (context.module) staffModuleStorage.set(context.module);
      else staffModuleStorage.clear();
      this.setContext(result.context ?? { ...EMPTY_CONTEXT });
      await this.loadProfile();
    },

    logout() {
      tokenStorage.clear();
      academicContextStorage.clear();
      staffModuleStorage.clear();
      this.context = { ...EMPTY_CONTEXT };
      this.user = null;
      this.permissions = [];
      useMenuStore().reset();
    },
  },
});
