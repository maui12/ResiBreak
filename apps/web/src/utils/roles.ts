// Deben coincidir con apps/api/src/common/roles.ts (se comparan en minúsculas).
export type Rol = 'admin' | 'consulta' | 'proveedor' | 'residente';

export const ROLES_ADMIN: Rol[] = ['admin', 'consulta'];
export const ROLES_PROVEEDOR: Rol[] = ['proveedor', 'admin'];

/** Pantalla a la que va cada rol después de iniciar sesión. */
export const RUTA_INICIAL: Partial<Record<Rol, string>> = {
  admin: '/admin/panel',
  consulta: '/admin/panel',
  proveedor: '/proveedor/pedidos-de-hoy',
  // El residente usa la app móvil; en la web no tiene vista.
};

export function rutaInicial(rol: string | null | undefined): string | undefined {
  return rol ? RUTA_INICIAL[rol.toLowerCase() as Rol] : undefined;
}
