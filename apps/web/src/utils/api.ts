import { cerrarSesion, obtenerToken } from './sesion';

/** URL base de la API, con el prefijo /api. Se configura en apps/web/.env (VITE_API_URL). */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ValorConsulta = string | number | boolean | undefined | null;

/** Arma "?a=1&b=2" omitiendo los valores vacíos. */
export function consulta(parametros: Record<string, ValorConsulta>): string {
  const pares = Object.entries(parametros).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return pares.length ? `?${new URLSearchParams(pares.map(([k, v]) => [k, String(v)])).toString()}` : '';
}

function mensajeSegunEstado(status: number, datos: unknown): string {
  const message = (datos as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message) && message.length) return message.join('. ');
  if (typeof message === 'string' && message) return message;
  if (status === 429) return 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.';
  if (status === 403) return 'Tu usuario no tiene permiso para realizar esta acción.';
  if (status === 413) return 'La información enviada es demasiado grande.';
  return `El servidor respondió con un error (${status}).`;
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = obtenerToken();
  const headers = new Headers(opciones.headers);
  headers.set('Accept', 'application/json');
  if (opciones.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  // Token vencido o inválido: limpiar y volver al login (el login mismo no cuenta)
  if (respuesta.status === 401 && token && ruta !== '/auth/login') {
    cerrarSesion();
    window.location.assign('/login');
  }

  if (respuesta.status === 204) return undefined as T;
  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ApiError(respuesta.status, mensajeSegunEstado(respuesta.status, datos));
  return datos as T;
}
