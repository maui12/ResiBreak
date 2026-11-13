// Utilidades de fechas en hora local. Sin Intl: el soporte de 'es-CL'
// cambia según la versión de Hermes y el dispositivo.

export const NOMBRES_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const CABECERA_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-DD, el formato que usa el backend. */
export function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Medianoche local de una fecha AAAA-MM-DD. */
export function fechaDesdeClave(clave: string): Date {
  const [anio, mes, dia] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

/** Ej.: "lunes 12 de octubre". */
export function formatoFechaLarga(fecha: Date): string {
  const mes = NOMBRES_MESES[fecha.getMonth()].toLowerCase();
  return `${NOMBRES_DIAS[fecha.getDay()]} ${fecha.getDate()} de ${mes}`;
}

/** Ej.: "jue 29 oct, 14:05". */
export function formatoFechaHora(fecha: Date): string {
  const dia = `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  return `${dia}, ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

export function diaCorto(fecha: Date): string {
  return DIAS_CORTOS[fecha.getDay()];
}

export function mesCorto(fecha: Date): string {
  return MESES_CORTOS[fecha.getMonth()];
}

/** AAAA-MM-DD -> DD-MM-AAAA (como se escribe en los formularios). */
export const textoDesdeClave = (clave: string) => clave.split('-').reverse().join('-');

/** Mientras se escribe: "1211" -> "12-11", "12112026" -> "12-11-2026". */
export function mascaraFecha(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('-');
}

/** DD-MM-AAAA -> AAAA-MM-DD, o null si no es una fecha que exista. */
export function claveDesdeTexto(texto: string): string | null {
  const partes = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const [, dd, mm, aaaa] = partes;
  const fecha = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  const existe = fecha.getDate() === Number(dd) && fecha.getMonth() === Number(mm) - 1 && Number(aaaa) >= 2000;
  return existe ? `${aaaa}-${mm}-${dd}` : null;
}

/** Suma días a una fecha AAAA-MM-DD y devuelve otra AAAA-MM-DD. */
export function sumarDiasClave(clave: string, dias: number): string {
  return claveFecha(sumarDias(fechaDesdeClave(clave), dias));
}

/** Cantidad de celdas vacías antes del día 1 (la semana empieza en lunes). `mes` va de 1 a 12. */
export function huecosInicioMes(anio: number, mes: number): number {
  return (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
}

/* ------------------------------------------------------------------
   Regla de anticipación mínima

   Es la misma que aplica el backend a los pedidos del residente: el día
   se mide desde las 00:00, así que un día solo se puede agendar (o un
   pedido cambiar) si su inicio queda a `anticipacionMinimaHoras` o más
   de distancia desde ahora.
------------------------------------------------------------------- */

/** Primer instante en que puede empezar un día agendable: ahora + anticipación mínima. */
export function momentoMinimoReserva(ahora: Date, anticipacionMinimaHoras: number): Date {
  return new Date(ahora.getTime() + anticipacionMinimaHoras * 3_600_000);
}

/** ¿El día (AAAA-MM-DD) empieza en o después del momento mínimo? */
export function esFechaReservable(clave: string, minimo: Date): boolean {
  return fechaDesdeClave(clave).getTime() >= minimo.getTime();
}

/** Primer día completo que se puede agendar. */
export function primerDiaReservable(minimo: Date): Date {
  const dia = inicioDelDia(minimo);
  return dia.getTime() === minimo.getTime() ? dia : sumarDias(dia, 1);
}