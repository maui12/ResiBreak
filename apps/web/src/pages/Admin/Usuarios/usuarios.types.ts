// GET/POST/PATCH /api/usuarios (ver apps/api/src/auth/usuarios.controller.ts).

export type TipoUsuario = 'residentes' | 'administradores' | 'proveedores';
export type RolUsuario = 'admin' | 'consulta' | 'proveedor' | 'residente';

export interface VistaUsuario {
  id: number;
  rut: string;
  rol: RolUsuario;
  nombre: string | null;
  email: string | null;
  activo: boolean;
  becadoId: number | null;
  especialidad: string | null;
  hospitalId: number | null;
  /** Todavía no tiene contraseña (espera el correo de bienvenida o que el admin le asigne una). */
  sinClave: boolean;
  ultimoLoginEn: string | null;
  creadoEn: string;
}

export interface ConfigTipo {
  titulo: string;
  singular: string;
  descripcion: string;
}

export const TIPOS: Record<TipoUsuario, ConfigTipo> = {
  residentes: {
    titulo: 'Residentes',
    singular: 'residente',
    descripcion: 'Becados que agendan sus comidas en la app.',
  },
  administradores: {
    titulo: 'Administradores',
    singular: 'administrador',
    descripcion: 'Gestionan la app. Incluye cuentas de solo consulta.',
  },
  proveedores: {
    titulo: 'Proveedores',
    singular: 'proveedor',
    descripcion: 'Preparan y entregan las comidas.',
  },
};

export const esTipoUsuario = (valor: string | undefined): valor is TipoUsuario =>
  valor === 'residentes' || valor === 'administradores' || valor === 'proveedores';

export const NOMBRE_ROL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  consulta: 'Solo consulta',
  proveedor: 'Proveedor',
  residente: 'Residente',
};
