/**
 * Se ejecuta después de `expo export --platform web` (lo usa apps/web/Dockerfile):
 *  - agrega al <head> las etiquetas para instalar la app como ícono (web/pwa-head.html),
 *  - usa la ruta base (ej. /app/) en los enlaces del manifiesto y del ícono,
 *  - copia el ícono de la app como apple-touch-icon.png e icon-512.png.
 *
 * Uso: node web/preparar-web.mjs dist /app/
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [salida = 'dist', base = '/'] = process.argv.slice(2);
const index = join(salida, 'index.html');
const cabecera = readFileSync(new URL('./pwa-head.html', import.meta.url), 'utf8').replaceAll('%BASE%', base);

let html = readFileSync(index, 'utf8');
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${cabecera}  </head>`);
  // iPhone con notch: el contenido usa toda la pantalla y los márgenes los maneja la app.
  html = html.replace(/<meta name="viewport" content="([^"]*)"/, (m, c) =>
    c.includes('viewport-fit') ? m : `<meta name="viewport" content="${c}, viewport-fit=cover"`,
  );
  writeFileSync(index, html);
}

const icono = new URL('../assets/images/icon.png', import.meta.url);
copyFileSync(icono, join(salida, 'apple-touch-icon.png'));
copyFileSync(icono, join(salida, 'icon-512.png'));
console.log(`Web lista en ${salida} (base ${base})`);
