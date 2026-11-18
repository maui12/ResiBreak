/**
 * Validación de las variables de entorno. Si algo falta o es inseguro, la API no arranca:
 * es mejor fallar al inicio que descubrirlo en producción.
 */

const REQUERIDAS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

/** El token dura como máximo 8 horas (una jornada). */
export const JWT_EXPIRA_MAX_SEGUNDOS = 8 * 60 * 60; // 28800

/** Zona horaria con la que se calculan "hoy" y la regla de anticipación. */
export const ZONA_HORARIA = 'America/Santiago';

const ORIGEN_VALIDO = /^https?:\/\/[^\s/,]+$/; // protocolo + host[:puerto], sin ruta ni barra final

export function validarEnv(env: Record<string, unknown>): Record<string, unknown> {
  const errores: string[] = [];
  const texto = (k: string) => (env[k] === undefined || env[k] === null ? '' : String(env[k]).trim());
  const produccion = texto('NODE_ENV') === 'production';

  // 1. Obligatorias
  const faltan = REQUERIDAS.filter((k) => !texto(k));
  if (faltan.length > 0) errores.push(`Faltan variables de entorno: ${faltan.join(', ')}`);

  // 2. Base de datos
  if (texto('DB_PORT') && !esEnteroEntre(texto('DB_PORT'), 1, 65535)) errores.push('DB_PORT debe ser un puerto válido');
  if (texto('DB_SYNC') && !['true', 'false'].includes(texto('DB_SYNC'))) errores.push('DB_SYNC debe ser "true" o "false"');
  if (texto('DB_MIGRAR') && !['true', 'false'].includes(texto('DB_MIGRAR'))) errores.push('DB_MIGRAR debe ser "true" o "false"');
  if (produccion && texto('DB_SYNC') === 'true') {
    errores.push('DB_SYNC=true está prohibido en producción (puede borrar columnas y datos). Usa migraciones.');
  }

  // 3. JWT
  if (texto('JWT_SECRET') && texto('JWT_SECRET').length < 32) errores.push('JWT_SECRET debe tener al menos 32 caracteres');
  if (texto('JWT_EXPIRES_SEGUNDOS') && !esEnteroEntre(texto('JWT_EXPIRES_SEGUNDOS'), 60, JWT_EXPIRA_MAX_SEGUNDOS)) {
    errores.push(`JWT_EXPIRES_SEGUNDOS debe ser un entero entre 60 y ${JWT_EXPIRA_MAX_SEGUNDOS} (8 horas)`);
  }

  // 4. Servidor
  if (texto('PORT') && !esEnteroEntre(texto('PORT'), 1, 65535)) errores.push('PORT debe ser un puerto válido');
  if (texto('TRUST_PROXY') && !esEnteroEntre(texto('TRUST_PROXY'), 0, 10)) {
    errores.push('TRUST_PROXY debe ser la cantidad de proxies delante de la API (0 a 10)');
  }
  if (texto('BODY_LIMIT') && !/^\d+(b|kb|mb)$/i.test(texto('BODY_LIMIT'))) errores.push('BODY_LIMIT debe ser como "100kb" o "1mb"');

  // 5. CORS: lista separada por comas de orígenes exactos (nunca "*").
  const origenes = texto('CORS_ORIGINS')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const invalidos = origenes.filter((o) => !ORIGEN_VALIDO.test(o));
  if (invalidos.length > 0) errores.push(`CORS_ORIGINS tiene orígenes inválidos: ${invalidos.join(', ')} (ej: https://resibreak.cl)`);
  if (produccion && origenes.length === 0) errores.push('CORS_ORIGINS es obligatorio en producción (la URL del sitio web)');
  if (produccion && origenes.some((o) => o.startsWith('http://') && !o.includes('localhost'))) {
    errores.push('En producción CORS_ORIGINS debe usar https://');
  }

  // 6. Zona horaria: las fechas se calculan con America/Santiago en el código, pero los logs y
  //    cualquier `new Date()` local también deben coincidir.
  if (texto('TZ') && texto('TZ') !== ZONA_HORARIA) errores.push(`TZ debe ser ${ZONA_HORARIA}`);
  if (produccion && !texto('TZ')) errores.push(`TZ es obligatorio en producción (${ZONA_HORARIA})`);

  // 7. Primer administrador
  if (produccion && texto('ADMIN_PASSWORD') && texto('ADMIN_PASSWORD').length < 12) {
    errores.push('ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }

  if (errores.length > 0) throw new Error(`Configuración inválida:\n - ${errores.join('\n - ')}`);
  return env;
}

function esEnteroEntre(valor: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(valor)) return false;
  const n = Number(valor);
  return n >= min && n <= max;
}
