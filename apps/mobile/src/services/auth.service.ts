/**
 * Inicio de sesión de DEMOSTRACIÓN (temporal).
 *
 * Entra al backend con un usuario real (el administrador inicial) para obtener un token válido,
 * así las tres vistas hablan con la API de verdad. Para el residente además busca al residente
 * de prueba (lo crea la API con SEED_DEMO=true) y deja su id en la sesión.
 *
 * ⚠ EXPO_PUBLIC_* queda dentro de la app compilada: sirve para desarrollo, NO para producción.
 * Cuando exista el login real y el rol residente, este archivo se reemplaza.
 */
import { ApiError, mensajeDeError, peticion } from '../api';
import { cerrarSesion, iniciarSesion } from '../sesion';

export type RolDemo = 'residente' | 'admin' | 'proveedor';

/** Mismo RUT que crea la API en becados.service.ts (RUT_RESIDENTE_DEMO). */
const RUT_RESIDENTE_DEMO = '11111111-1';

interface BecadoResumenApi {
  id: number;
  rut: string | null;
}

export async function iniciarSesionDemo(rol: RolDemo): Promise<void> {
  const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
  const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error('Faltan EXPO_PUBLIC_DEMO_EMAIL y EXPO_PUBLIC_DEMO_PASSWORD en mobile/.env (ver .env.example).');
  }

  cerrarSesion();
  const { accessToken } = await peticion<{ accessToken: string }>('/auth/login', {
    metodo: 'POST',
    cuerpo: { email, password },
  });

  if (rol !== 'residente') {
    iniciarSesion({ token: accessToken });
    return;
  }

  // La búsqueda del residente necesita el token, por eso se guarda primero sin residente.
  iniciarSesion({ token: accessToken });
  const hoy = new Date();
  const becados = await peticion<BecadoResumenApi[]>('/becados', {
    consulta: { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 },
  });
  const demo = becados.find((b) => b.rut === RUT_RESIDENTE_DEMO);
  if (!demo) {
    cerrarSesion();
    throw new Error('No existe el residente de prueba. Arranca la API con SEED_DEMO=true y reiníciala.');
  }
  iniciarSesion({ token: accessToken, residenteId: demo.id });
}

/** Texto para mostrar en pantalla si el inicio de sesión falla. */
export function mensajeDeLogin(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'El usuario de demostración no existe o su clave no coincide con ADMIN_EMAIL / ADMIN_PASSWORD de la API.';
  }
  return error instanceof Error && !(error instanceof ApiError) ? error.message : mensajeDeError(error);
}
