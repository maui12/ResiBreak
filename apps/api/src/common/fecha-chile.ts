/** Fechas como texto 'AAAA-MM-DD' en hora de Chile, sin depender de la zona horaria del servidor. */
const ZONA = 'America/Santiago';

export const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function hoyChile(): string {
  // El formato en-CA entrega AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

export function sumarDias(fecha: string, dias: number): string {
  // Convertir la fecha a la zona horaria de Chile
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Verifica formato y que el día exista (rechaza 2026-02-31). */
export function esFechaValida(fecha: string): boolean {
  if (!FECHA_ISO.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}
