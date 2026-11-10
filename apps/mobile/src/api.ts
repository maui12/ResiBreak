import { router } from 'expo-router';

import { cerrarSesion, obtenerToken } from './sesion';

/**
 * Dirección del backend.
 * En un celular físico NO sirve "localhost": hay que usar la IP de tu computador
 * en la red WiFi (ej. http://192.168.1.50:3000/api). Se configura en mobile/.env:
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.1.50:3000/api
 *
 * (Emulador Android: http://10.0.2.2:3000/api — Simulador iOS: http://localhost:3000/api)
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export type TipoDia = 'normal' | '24h';

export interface DiaCalendario {
  fecha: string;
  dia: number;
  tipo: TipoDia;
  turnos: number;
}

export interface MesCalendario {
  anio: number;
  mes: number; // 1 a 12
  dias: DiaCalendario[];
}

/** Error de la API con el código HTTP y un mensaje listo para mostrar. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Mensaje amigable para mostrar en pantalla a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Inténtalo nuevamente.';
}

type ValorConsulta = string | number | undefined;

interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  consulta?: Record<string, ValorConsulta>;
}

/** Texto que envió el servidor. Nest responde { statusCode, message } y message puede ser un texto o una lista. */
export function mensajeDelServidor(cuerpo: unknown): string | null {
  const mensaje = (cuerpo as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje) && mensaje.length > 0) return mensaje.join('. ');
  if (typeof mensaje === 'string' && mensaje.length > 0) return mensaje;
  return null;
}

function mensajeSegunRespuesta(status: number, cuerpo: unknown): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (status === 429) return 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.';

  const mensaje = mensajeDelServidor(cuerpo);
  if (mensaje) return mensaje;
  if (status === 403) return 'Tu usuario no tiene permiso para realizar esta acción.';

  return `El servidor respondió con un error (${status}).`;
}

/** Petición al backend: agrega el token, convierte los errores en ApiError y devuelve el JSON. */
export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, consulta } = opciones;

  const parametros = Object.entries(consulta ?? {})
    .filter((entrada): entrada is [string, string | number] => entrada[1] !== undefined)
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`)
    .join('&');
  const url = `${API_URL}${ruta}${parametros ? `?${parametros}` : ''}`;

  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  const token = obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
      throw new ApiError(0, `No se pudo conectar con ${API_URL}. Revisa que la API esté corriendo y que sea alcanzable desde este dispositivo.`);
  }

  if (!respuesta.ok) {
    const cuerpoError: unknown = await respuesta.json().catch(() => null);

    // Token vencido o inválido: se cierra la sesión y se vuelve al login.
    if (respuesta.status === 401 && token) {
      cerrarSesion();
      router.replace('/login');
    }

    const mensaje =
      // En el login, el 401 son credenciales malas: se muestra el mensaje del servidor.
      respuesta.status === 401 && !token
        ? (mensajeDelServidor(cuerpoError) ?? 'Credenciales inválidas.')
        : mensajeSegunRespuesta(respuesta.status, cuerpoError);
    throw new ApiError(respuesta.status, mensaje);
  }

  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

export function obtenerCalendario(anio: number, mes: number): Promise<MesCalendario> {
  return peticion<MesCalendario>('/calendario', { consulta: { anio, mes } });
}