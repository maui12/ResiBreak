import { ConsolaEnvio } from './envio/consola.envio.js';
import type { Envio } from './envio/envio.js';
import { MemoriaEnvio } from './envio/memoria.envio.js';
import { SmtpEnvio } from './envio/smtp.envio.js';

/**
 * Variables del módulo de correo (ver README.md de esta carpeta):
 *
 *   CORREO_PROVEEDOR   smtp | consola | memoria   (por defecto: consola = no envía, solo registra)
 *   SMTP_HOST          servidor SMTP del proveedor
 *   SMTP_PORT          465, 587, 2525 o 1025 (Mailpit)
 *   SMTP_USER          usuario SMTP (vacío solo con Mailpit)
 *   SMTP_PASS          clave SMTP / API key del proveedor
 *   CORREO_REMITENTE   "ResiBreak <no-responder@resibreak.cl>"
 *   CORREO_URL_APP     URL pública de la app, para armar enlaces (ej. https://app.resibreak.cl)
 */
export const PROVEEDORES_CORREO = ['smtp', 'consola', 'memoria'] as const;
export type ProveedorCorreo = (typeof PROVEEDORES_CORREO)[number];

type Entorno = Record<string, unknown>;
const texto = (env: Entorno, k: string) => (env[k] === undefined || env[k] === null ? '' : String(env[k]).trim());

export function proveedorCorreo(env: Entorno): ProveedorCorreo {
  return (texto(env, 'CORREO_PROVEEDOR') || 'consola') as ProveedorCorreo;
}

/** Errores de configuración del correo (los usa env.validation.ts al arrancar). */
export function validarConfigCorreo(env: Entorno): string[] {
  const errores: string[] = [];
  const proveedor = proveedorCorreo(env);
  if (!PROVEEDORES_CORREO.includes(proveedor)) {
    return [`CORREO_PROVEEDOR debe ser uno de: ${PROVEEDORES_CORREO.join(', ')}`];
  }
  if (proveedor === 'smtp') {
    const puerto = texto(env, 'SMTP_PORT');
    const faltan = ['SMTP_HOST', 'SMTP_PORT', 'CORREO_REMITENTE'].filter((k) => !texto(env, k));
    // Sin usuario/clave solo se permite Mailpit (puerto 1025, desarrollo).
    if (puerto !== '1025') faltan.push(...['SMTP_USER', 'SMTP_PASS'].filter((k) => !texto(env, k)));
    if (faltan.length) errores.push(`Con CORREO_PROVEEDOR=smtp faltan: ${faltan.join(', ')}`);
    if (puerto && !/^\d+$/.test(puerto)) errores.push('SMTP_PORT debe ser un número (465, 587, 2525 o 1025)');
    const remitente = texto(env, 'CORREO_REMITENTE');
    if (remitente && !/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/.test(remitente)) {
      errores.push('CORREO_REMITENTE debe incluir un correo, ej: "ResiBreak <no-responder@resibreak.cl>"');
    }
  }
  const url = texto(env, 'CORREO_URL_APP');
  if (url && !/^https?:\/\/[^\s]+$/.test(url)) errores.push('CORREO_URL_APP debe ser una URL, ej: https://app.resibreak.cl');
  return errores;
}

/** Crea la implementación de envío según CORREO_PROVEEDOR. */
export function crearEnvio(env: Entorno): Envio {
  const proveedor = proveedorCorreo(env);
  switch (proveedor) {
    case 'smtp':
      return new SmtpEnvio({
        host: texto(env, 'SMTP_HOST'),
        puerto: Number(texto(env, 'SMTP_PORT')),
        usuario: texto(env, 'SMTP_USER'),
        clave: texto(env, 'SMTP_PASS'),
        remitente: texto(env, 'CORREO_REMITENTE'),
      });
    case 'memoria':
      return new MemoriaEnvio();
    case 'consola':
    default:
      return new ConsolaEnvio(texto(env, 'NODE_ENV') !== 'production');
  }
}
