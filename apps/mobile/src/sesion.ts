/**
 * Sesión del usuario en memoria.
 *
 * La llena el login con lo que devuelve POST /api/auth/login. El backend identifica al
 * residente por su token (el token trae su becadoId), así que la app no necesita guardar
 * ni enviar el id del residente.
 *
 * Vive solo en memoria: al cerrar la app hay que volver a iniciar sesión.
 */
export type Rol = 'admin' | 'consulta' | 'proveedor' | 'residente';

export interface Sesion {
  token: string;
  rol: Rol;
  /** Ficha del becado vinculada a la cuenta (solo residentes). */
  becadoId: number | null;
}

let sesion: Sesion | null = null;

export function iniciarSesion(datos: Sesion) {
  sesion = datos;
}

export function cerrarSesion() {
  sesion = null;
}

export function obtenerSesion(): Sesion | null {
  return sesion;
}

export function obtenerToken(): string | null {
  return sesion?.token ?? null;
}
