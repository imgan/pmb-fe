import { createCrudApi } from './crudFactory';
import type { Role } from '@/types/entities';

export interface RolePayload {
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
}

export const rolesApi = createCrudApi<Role, RolePayload, Partial<RolePayload>>('roles');
