import { cerrarSesion, obtenerToken } from './sesion.js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = obtenerToken();
  const headers = new Headers(opciones.headers);
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

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    // Nest devuelve `message` como texto o como lista (errores de validación)
    const mensaje = Array.isArray(datos?.message) ? datos.message.join(', ') : datos?.message;
    throw new ApiError(respuesta.status, mensaje ?? 'Error inesperado');
  }
  return datos as T;
}