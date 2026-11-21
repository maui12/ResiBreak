import { enlaceSeguro, escapar } from './escapar.js';

/** Lo que devuelve cada plantilla: listo para CorreoService. */
export interface CorreoArmado {
  asunto: string;
  html: string;
  texto: string;
}

// Colores de la app (apps/mobile/src/constants/theme.ts).
const AZUL = '#003057';
const NARANJO = '#AC6D33';
const GRIS = '#5f6b7a';

const PIE_TEXTO =
  'ResiBreak · Universidad Católica del Norte, Facultad de Medicina.\n' +
  'Este es un correo automático: no respondas a esta dirección.';

/**
 * Marco común de todos los correos: encabezado, contenido y pie.
 *
 * Los clientes de correo (sobre todo Outlook) ignoran gran parte del CSS: por eso se usan tablas,
 * estilos en línea y un ancho máximo de 600 px. `contenido` ya debe venir escapado.
 */
export function base(titulo: string, contenido: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="background:${AZUL};padding:20px 28px;color:#ffffff;font-size:22px;font-weight:bold;">ResiBreak</td></tr>
      <tr><td style="padding:28px;color:#1f2933;font-size:15px;line-height:1.6;">
        <h1 style="margin:0 0 16px;font-size:20px;color:${AZUL};">${escapar(titulo)}</h1>
        ${contenido}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e5e9ef;color:${GRIS};font-size:12px;line-height:1.5;">
        ResiBreak · Universidad Católica del Norte, Facultad de Medicina.<br>
        Este es un correo automático: no respondas a esta dirección.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Párrafo con texto ya escapado. */
export const parrafo = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`;

/** Botón (enlace con estilo). El texto se escapa; la URL solo se acepta si es http(s). */
export function boton(texto: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr>
<td style="background:${NARANJO};border-radius:8px;">
<a href="${enlaceSeguro(url)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:bold;text-decoration:none;">${escapar(texto)}</a>
</td></tr></table>`;
}

/** Nota pequeña en gris (ej. "si no fuiste tú, ignora este correo"). */
export const nota = (html: string) => `<p style="margin:14px 0 0;color:${GRIS};font-size:13px;">${html}</p>`;

/** Arma la versión de texto plano con el mismo pie que el HTML. */
export const textoPlano = (lineas: string[]) => `${lineas.join('\n')}\n\n--\n${PIE_TEXTO}\n`;
