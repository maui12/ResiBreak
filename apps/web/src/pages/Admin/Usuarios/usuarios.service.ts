import { api, consulta } from '../../../utils/api';
import type { RolUsuario, TipoUsuario, VistaUsuario } from './usuarios.types';

export const listarUsuarios = (tipo: TipoUsuario) => api<VistaUsuario[]>(`/usuarios${consulta({ tipo })}`);

export const obtenerUsuario = (id: number) => api<VistaUsuario>(`/usuarios/${id}`);

/** Especialidades existentes (de los becados y de los tipos de turno), sin repetir. */
export const listarEspecialidades = () => api<string[]>('/turnos-disponibles/especialidades');

export interface NuevoResidente {
  nombre: string;
  rut: string;
  especialidad: string;
  email: string;
}

export const crearResidente = (datos: NuevoResidente) =>
  api<VistaUsuario>('/usuarios/residentes', { method: 'POST', body: JSON.stringify(datos) });

export interface NuevoUsuario {
  rol: Exclude<RolUsuario, 'residente'>;
  nombre: string;
  rut: string;
  email: string;
}

export const crearUsuario = (datos: NuevoUsuario) =>
  api<VistaUsuario>('/usuarios', { method: 'POST', body: JSON.stringify(datos) });

export interface CambiosUsuario {
  nombre?: string;
  email?: string | null;
  especialidad?: string;
  rol?: 'admin' | 'consulta';
  activo?: boolean;
  password?: string;
}

export const actualizarUsuario = (id: number, cambios: CambiosUsuario) =>
  api<VistaUsuario>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });

/* ---------------------------- Utilidades de formulario ---------------------------- */

/** "  Cirugía   General " -> "cirugia general". Para buscar y comparar sin tildes ni mayúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
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
  return dv ? `${Number(cuerpo).toLocaleString('es-CL')}-${dv}` : rut;
}

export const esCorreoValido = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());

/** Busca el texto en nombre, RUT (con o sin puntos) y correo. */
export function coincideTexto(u: VistaUsuario, texto: string): boolean {
  const t = normalizar(texto);
  if (!t) return true;
  const rutPlano = t.replace(/[.\s]/g, '');
  return (
    normalizar(u.nombre ?? '').includes(t) ||
    u.rut.toLowerCase().includes(rutPlano) ||
    (u.email ?? '').includes(t)
  );
}
