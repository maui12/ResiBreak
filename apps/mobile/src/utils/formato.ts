// Formatos de números sin Intl: el soporte de 'es-CL' cambia según la versión de Hermes y el dispositivo.

/** 1234567 -> "1.234.567" */
export function formatoNumero(valor: number): string {
  const signo = valor < 0 ? '-' : '';
  return signo + String(Math.round(Math.abs(valor))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1234567 -> "$1.234.567" (pesos chilenos, sin decimales) */
export function formatoPesos(valor: number): string {
  return `$${formatoNumero(valor)}`;
}
