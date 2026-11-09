/**
 * Sesión del usuario en memoria.
 *
 * Cuando la pantalla de login esté conectada al backend, debe llamar a
 * `iniciarSesion` con el `accessToken` que devuelve POST /api/auth/login
 * (y el id del residente, cuando el backend lo entregue).
 *
 * Para desarrollo, mientras el login no esté conectado, se puede definir en
 * mobile/.env (ver .env.example):
 *
 *   EXPO_PUBLIC_API_TOKEN=<token de un usuario>      (solo desarrollo)
 *   EXPO_PUBLIC_RESIDENTE_ID=<id del residente>
 *
 * Ojo: las variables EXPO_PUBLIC_* quedan dentro del bundle de la app,
 * así que no uses un token real en producción.
 */
let token: string | null = null;
let residenteId: number | null = null;

function numeroDeEntorno(valor: string | undefined): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function iniciarSesion(datos: { token: string; residenteId?: number }) {
  token = datos.token;
  residenteId = datos.residenteId ?? null;
}

export function cerrarSesion() {
  token = null;
  residenteId = null;
}

export function obtenerToken(): string | null {
  return token ?? process.env.EXPO_PUBLIC_API_TOKEN ?? null;
}

export function obtenerResidenteId(): number | null {
  return residenteId ?? numeroDeEntorno(process.env.EXPO_PUBLIC_RESIDENTE_ID);
}