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

/** Suma días a una fecha AAAA-MM-DD y devuelve otra AAAA-MM-DD. */
export function sumarDiasClave(clave: string, dias: number): string {
  return claveFecha(sumarDias(fechaDesdeClave(clave), dias));
}

/** Cantidad de celdas vacías antes del día 1 (la semana empieza en lunes). `mes` va de 1 a 12. */
export function huecosInicioMes(anio: number, mes: number): number {
  return (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
}

/* ------------------------------------------------------------------
   Regla de anticipación (la misma del backend, common/fecha-chile.ts)

   Con `anticipacionMinimaDias` = 1: para el día D se puede agendar, cambiar
   o cancelar hasta las 23:59 del día anterior (D-1). A las 00:00 del día D
   ya no. Se calcula con días de calendario, así que los cambios de horario
   no la afectan. El servidor es quien decide al final: esto solo sirve para
   habilitar o deshabilitar días en pantalla.
------------------------------------------------------------------- */

/** Primer día (a las 00:00) que todavía se puede agendar, cambiar o cancelar. */
export function primerDiaReservable(ahora: Date, anticipacionMinimaDias: number): Date {
  return sumarDias(inicioDelDia(ahora), anticipacionMinimaDias);
}

/** ¿El día (AAAA-MM-DD) se puede agendar/cambiar/cancelar? Comparar AAAA-MM-DD como texto es seguro. */
export function esFechaReservable(clave: string, primerDia: Date): boolean {
  return clave >= claveFecha(primerDia);
}

/** Último día en que se puede modificar `clave` (a las 23:59). */
export function ultimoDiaParaModificar(clave: string, anticipacionMinimaDias: number): Date {
  return sumarDias(fechaDesdeClave(clave), -anticipacionMinimaDias);
}

/** "hasta las 23:59 del miércoles 11 de noviembre" */
export function textoPlazo(clave: string, anticipacionMinimaDias: number): string {
  return `hasta las 23:59 del ${formatoFechaLarga(ultimoDiaParaModificar(clave, anticipacionMinimaDias))}`;
}

/** Texto de ayuda de la regla, según la configuración. */
export function textoRegla(anticipacionMinimaDias: number): string {
  if (anticipacionMinimaDias === 0) return 'Puedes agendar, cambiar o cancelar hasta las 23:59 del mismo día.';
  if (anticipacionMinimaDias === 1) return 'Puedes agendar, cambiar o cancelar hasta las 23:59 del día anterior.';
  return `Puedes agendar, cambiar o cancelar hasta las 23:59 de ${anticipacionMinimaDias} días antes.`;
}
