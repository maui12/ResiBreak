import { SetMetadata } from '@nestjs/common';

export enum Rol {
  ADMIN = 'admin',
  CONSULTA = 'consulta',
  PROVEEDOR = 'proveedor',
  RESIDENTE = 'residente',
  
}

export const IS_PUBLIC = 'isPublic';
/** Marca una ruta como pública (sin token). Todo lo demás exige login. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
/** Restringe una ruta a ciertos roles. Sin @Roles, solo entra el ADMIN. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
