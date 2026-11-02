const REQUERIDAS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

/** Si falta algo, la API no arranca: es mejor fallar al inicio que en producción. */

export function validarEnv(env: Record<string, unknown>): Record<string, unknown> {
  const faltan = REQUERIDAS.filter((k) => !env[k]);
  if (faltan.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}`);
  }
  if (String(env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  return env;
}
