/**
 * Sesión del usuario en el navegador. El token dura como máximo 8 horas (lo decide el backend).
 * Se guarda en sessionStorage: se borra al cerrar la pestaña y no queda en el equipo.
 */
import type { Rol } from './roles';

const CLAVE_TOKEN = 'resibreak_token';
const CLAVE_ROL = 'resibreak_rol';

function almacen(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null; // navegación privada estricta o almacenamiento bloqueado
  }
}

export function guardarSesion(token: string, rol: string) {
  almacen()?.setItem(CLAVE_TOKEN, token);
  almacen()?.setItem(CLAVE_ROL, rol.toLowerCase());
}

export const obtenerToken = () => almacen()?.getItem(CLAVE_TOKEN) ?? null;
export const obtenerRol = () => (almacen()?.getItem(CLAVE_ROL) ?? null) as Rol | null;

/** Hay sesión si hay token y no está vencido (se revisa el campo exp del JWT, sin verificar la firma). */
export function haySesion(): boolean {
  const token = obtenerToken();
  if (!token) return false;
  try {
    const cuerpo = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(cuerpo)) as { exp?: number };
    if (exp && exp * 1000 <= Date.now()) {
      cerrarSesion();
      return false;
    }
    return true;
  } catch {
    cerrarSesion();
    return false;
  }
}

export function cerrarSesion() {
  almacen()?.removeItem(CLAVE_TOKEN);
  almacen()?.removeItem(CLAVE_ROL);
}
