import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { RoleMenuPermission } from '@/types/entities';

export interface PermissionAssignment {
  menuId: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const permissionsApi = {
  async getByRole(roleId: number | string): Promise<RoleMenuPermission[]> {
    const { data } = await http.get<ApiResponse<RoleMenuPermission[]>>(`/roles/${roleId}/permissions`);
    return data.data;
  },
  async assign(roleId: number | string, permissions: PermissionAssignment[]): Promise<RoleMenuPermission[]> {
    const { data } = await http.put<ApiResponse<RoleMenuPermission[]>>(`/roles/${roleId}/permissions`, {
      permissions,
    });
    return data.data;
  },
};
