/**
 * Administrar usuarios (solo admin): GET/POST/PATCH /api/usuarios.
 * Ver apps/api/src/auth/usuarios.controller.ts.
 */
import { peticion } from '@/api';

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

export const TIPOS: Record<TipoUsuario, { titulo: string; singular: string; descripcion: string; icono: string }> = {
  residentes: { titulo: 'Residentes', singular: 'residente', descripcion: 'Becados que agendan sus comidas.', icono: '♙' },
  administradores: {
    titulo: 'Administradores',
    singular: 'administrador',
    descripcion: 'Gestionan la app. Incluye cuentas de solo consulta.',
    icono: '⚙',
  },
  proveedores: { titulo: 'Proveedores', singular: 'proveedor', descripcion: 'Preparan y entregan las comidas.', icono: '▤' },
};

export const ORDEN_TIPOS: TipoUsuario[] = ['residentes', 'administradores', 'proveedores'];

export const esTipoUsuario = (valor: unknown): valor is TipoUsuario =>
  valor === 'residentes' || valor === 'administradores' || valor === 'proveedores';

export const NOMBRE_ROL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  consulta: 'Solo consulta',
  proveedor: 'Proveedor',
  residente: 'Residente',
};

export const LARGO_MINIMO_CLAVE = 12;

/* ------------------------------------ API ------------------------------------ */

export const listarUsuarios = (tipo: TipoUsuario) => peticion<VistaUsuario[]>('/usuarios', { consulta: { tipo } });

export const obtenerUsuario = (id: number) => peticion<VistaUsuario>(`/usuarios/${id}`);

/** Especialidades existentes (de los becados y de los tipos de turno), sin repetir. */
export const listarEspecialidades = () => peticion<string[]>('/turnos-disponibles/especialidades');

export const crearResidente = (datos: { nombre: string; rut: string; especialidad: string; email: string }) =>
  peticion<VistaUsuario>('/usuarios/residentes', { metodo: 'POST', cuerpo: datos });

export const crearUsuario = (datos: { rol: 'admin' | 'consulta' | 'proveedor'; nombre: string; rut: string; email: string }) =>
  peticion<VistaUsuario>('/usuarios', { metodo: 'POST', cuerpo: datos });

export interface CambiosUsuario {
  nombre?: string;
  email?: string | null;
  especialidad?: string;
  rol?: 'admin' | 'consulta';
  activo?: boolean;
  password?: string;
}

export const actualizarUsuario = (id: number, cambios: CambiosUsuario) =>
  peticion<VistaUsuario>(`/usuarios/${id}`, { metodo: 'PATCH', cuerpo: cambios });

/* -------------------------------- Utilidades -------------------------------- */

/** "  Cirugía   General " -> "cirugia general". Para buscar y comparar sin tildes ni mayúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const FORMATO_RUT = /^(\d{1,2})\.?(\d{3})\.?(\d{3})-?([\dkK])$/;

/** "12.345.678-k" -> "12345678-K" (o el texto tal cual si no tiene forma de RUT). */
export function normalizarRut(valor: string): string {
  const m = FORMATO_RUT.exec(valor.replace(/\s/g, ''));
  return m ? `${m[1]}${m[2]}${m[3]}-${m[4].toUpperCase()}` : valor.trim();
}

/** RUT con dígito verificador correcto (la API lo vuelve a validar). */
export function esRutValido(valor: string): boolean {
  const m = /^(\d{7,8})-([\dK])$/.exec(normalizarRut(valor));
  if (!m) return false;
  let suma = 0;
  let mult = 2;
  for (let i = m[1].length - 1; i >= 0; i--) {
    suma += Number(m[1][i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  return (resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)) === m[2];
}

/** "12345678-5" -> "12.345.678-5" (para mostrar). */
export function formatoRut(rut: string): string {
  const [cuerpo, dv] = rut.split('-');
  if (!dv) return rut;
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

export const esCorreoValido = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());

/** Busca el texto en nombre, RUT (con o sin puntos) y correo. */
export function coincideTexto(u: VistaUsuario, texto: string): boolean {
  const t = normalizar(texto);
  if (!t) return true;
  const rutPlano = t.replace(/[.\s]/g, '');
  return normalizar(u.nombre ?? '').includes(t) || u.rut.toLowerCase().includes(rutPlano) || (u.email ?? '').includes(t);
}
