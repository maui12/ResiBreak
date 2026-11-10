/**
 * Inicio de sesión contra el backend: POST /api/auth/login { rut, password }.
 *
 * El backend normaliza el RUT (acepta "12.345.678-5" o "12345678-5"), bloquea la cuenta
 * unos minutos tras varios intentos fallidos y entrega un token que ya trae el rol y,
 * en los residentes, el id de su ficha de becado.
 */
import type { Href } from 'expo-router';

import { mensajeDeError, peticion } from '../api';
import { cerrarSesion, iniciarSesion, type Rol } from '../sesion';

interface RespuestaLogin {
  accessToken: string;
  rol: Rol;
  becadoId: number | null;
  hospitalId: number | null;
}

/** Pantalla de inicio de cada rol. */
export const RUTA_INICIAL: Record<Rol, Href> = {
  residente: '/becado/panelBecado',
  admin: '/admin/panelAdmin',
  consulta: '/admin/panelAdmin',
  proveedor: '/proveedor/panelProveedor',
};

/** Error del login que no viene del servidor (por ejemplo, una cuenta mal configurada). */
export class LoginError extends Error {}

/** Inicia sesión y devuelve la ruta a la que hay que ir. */
export async function iniciarSesionConRut(rut: string, password: string): Promise<Href> {
  cerrarSesion();
  const respuesta = await peticion<RespuestaLogin>('/auth/login', {
    metodo: 'POST',
    cuerpo: { rut: rut.trim(), password },
  });

  const ruta = RUTA_INICIAL[respuesta.rol];
  if (!ruta) throw new LoginError('Tu cuenta tiene un rol que la app no reconoce.');
  if (respuesta.rol === 'residente' && respuesta.becadoId === null) {
    throw new LoginError('Tu cuenta no está vinculada a una ficha de residente. Contacta a administración.');
  }

  iniciarSesion({ token: respuesta.accessToken, rol: respuesta.rol, becadoId: respuesta.becadoId });
  return ruta;
}

/** Texto para mostrar en pantalla si el inicio de sesión falla. */
export function mensajeDeLogin(error: unknown): string {
  return error instanceof LoginError ? error.message : mensajeDeError(error);
}
