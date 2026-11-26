// Deben coincidir con apps/api/src/common/roles.ts (se comparan en minúsculas).
export type Rol = 'admin' | 'consulta' | 'proveedor' | 'residente';

export const ROLES_ADMIN: Rol[] = ['admin', 'consulta'];
/** Pantallas que modifican usuarios: solo el admin (consulta no las ve). */
export const SOLO_ADMIN: Rol[] = ['admin'];
export const ROLES_PROVEEDOR: Rol[] = ['proveedor', 'admin'];
export const ROLES_RESIDENTE: Rol[] = ['residente'];

/** Pantalla a la que va cada rol después de iniciar sesión. */
export const RUTA_INICIAL: Partial<Record<Rol, string>> = {
  admin: '/admin/panel',
  consulta: '/admin/panel',
  proveedor: '/proveedor/proximos-dias',
  residente: '/residente/inicio',
};

export function rutaInicial(rol: string | null | undefined): string | undefined {
  return rol ? RUTA_INICIAL[rol.toLowerCase() as Rol] : undefined;
}
