import { createCrudApi } from './crudFactory';
import type { User } from '@/types/entities';

export interface UserCreatePayload {
  name: string;
  username: string;
  email: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}

export interface UserUpdatePayload {
  name?: string;
  email?: string;
  password?: string;
  roleId?: number;
  isActive?: boolean;
}

export const usersApi = createCrudApi<User, UserCreatePayload, UserUpdatePayload>('users');
