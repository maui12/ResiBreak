/**
 * Fechas de calendario en hora de Chile (America/Santiago).
 *
 * Todo se trabaja como texto 'AAAA-MM-DD' (igual que la columna `date` de PostgreSQL) y "hoy" se
 * calcula con Intl en la zona de Chile. Por eso el resultado NO depende de la zona horaria del
 * servidor (TZ), ni de los cambios de horario de invierno/verano: un día siempre es un día,
 * dure 23, 24 o 25 horas.
 */
export const ZONA_CHILE = 'America/Santiago';

export const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// en-CA formatea como AAAA-MM-DD. Se crea una sola vez (crear Intl.DateTimeFormat es costoso).
const FORMATO_FECHA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_CHILE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const FORMATO_HORA = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_CHILE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Fecha de hoy en Chile ('AAAA-MM-DD'). `ahora` permite fijar el instante en las pruebas. */
export function hoyChile(ahora: Date = new Date()): string {
  return FORMATO_FECHA.format(ahora);
}

/** Hora actual en Chile ('HH:MM', de 00:00 a 23:59). */
export function horaChile(ahora: Date = new Date()): string {
  return FORMATO_HORA.format(ahora);
}

/** Verifica el formato y que el día exista en el calendario (rechaza 2026-02-31 o 2025-02-29). */
export function esFechaValida(fecha: string): boolean {
  if (typeof fecha !== 'string' || !FECHA_ISO.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** Suma (o resta) días de calendario. Se calcula en UTC puro, así que no le afectan los cambios de horario. */
export function sumarDias(fecha: string, dias: number): string {
  if (!esFechaValida(fecha)) throw new RangeError(`Fecha inválida: ${fecha}`);
  if (!Number.isInteger(dias)) throw new RangeError(`La cantidad de días debe ser entera: ${dias}`);
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Días de calendario entre dos fechas (hasta - desde). */
export function diferenciaDias(desde: string, hasta: string): number {
  if (!esFechaValida(desde) || !esFechaValida(hasta)) throw new RangeError('Fecha inválida');
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

/** ¿Es año bisiesto? */
export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Último día del mes (`mes` de 1 a 12). */
export function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/* ------------------------------------------------------------------------------------------
 * Regla de anticipación (pedidos del residente)
 *
 * Con `diasAnticipacion` = 1 (valor por defecto): para el día D se puede agendar, cambiar o
 * cancelar hasta las 23:59 (hora de Chile) del día D-1. A las 00:00 del día D ya no.
 * Con 0: se permite hasta las 23:59 del mismo día. Con 2: hasta las 23:59 de D-2, etc.
 * ------------------------------------------------------------------------------------------ */

/** Primer día que todavía se puede agendar/cambiar/cancelar en este momento. */
export function primerDiaPermitido(diasAnticipacion: number, ahora: Date = new Date()): string {
  return sumarDias(hoyChile(ahora), diasAnticipacion);
}

/** ¿Se puede agendar, cambiar o cancelar el día `fecha` ahora? Las fechas pasadas siempre son false. */
export function cumpleAnticipacion(fecha: string, diasAnticipacion: number, ahora: Date = new Date()): boolean {
  if (!esFechaValida(fecha)) return false;
  return fecha >= primerDiaPermitido(diasAnticipacion, ahora); // comparar AAAA-MM-DD como texto es seguro
}

/** Último día (a las 23:59 de Chile) en que se puede hacer cambios a `fecha`. */
export function ultimoDiaParaModificar(fecha: string, diasAnticipacion: number): string {
  return sumarDias(fecha, -diasAnticipacion);
}

/** Mensaje claro para el usuario: "hasta las 23:59 del 2026-11-12". */
export function mensajePlazo(fecha: string, diasAnticipacion: number): string {
  return `hasta las 23:59 del ${ultimoDiaParaModificar(fecha, diasAnticipacion)} (hora de Chile)`;
}
