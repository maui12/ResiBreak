/** Fechas en hora local. El backend usa AAAA-MM-DD (hora de Chile). */

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

/** La semana empieza en lunes. */
export const CABECERA_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dos = (n: number) => String(n).padStart(2, '0');

export interface Periodo {
  anio: number;
  mes: number; // 1 a 12
}

export function periodoActual(): Periodo {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
}

/** AAAA-MM-DD */
export function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Medianoche local de una fecha AAAA-MM-DD. */
export function fechaDesdeClave(clave: string): Date {
  const [anio, mes, dia] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

export function sumarDiasClave(clave: string, dias: number): string {
  return claveFecha(sumarDias(fechaDesdeClave(clave), dias));
}

/** Primer y último día del mes, en AAAA-MM-DD. */
export function rangoDelMes({ anio, mes }: Periodo): { desde: string; hasta: string } {
  const ultimo = new Date(anio, mes, 0).getDate();
  return { desde: `${anio}-${dos(mes)}-01`, hasta: `${anio}-${dos(mes)}-${dos(ultimo)}` };
}

/** Celdas vacías antes del día 1 (semana desde el lunes). `mes` va de 1 a 12. */
export function huecosInicioMes(anio: number, mes: number): number {
  return (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
}

/** "lunes 12 de octubre" */
export function formatoFechaLarga(fecha: Date): string {
  return `${NOMBRES_DIAS[fecha.getDay()]} ${fecha.getDate()} de ${NOMBRES_MESES[fecha.getMonth()].toLowerCase()}`;
}

/** "jue 29 oct, 14:05" */
export function formatoFechaHora(fecha: Date): string {
  const dia = `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  return `${dia}, ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** AAAA-MM-DD -> DD-MM-AAAA */
export const textoDesdeClave = (clave: string) => clave.split('-').reverse().join('-');

/* ------------------------------------------------------------------
   Regla de anticipación (la misma del backend, common/fecha-chile.ts).
   Con 1 día: para el día D se puede agendar, cambiar o cancelar hasta las
   23:59 del día anterior. El servidor decide al final; esto solo habilita
   o deshabilita días en pantalla.
------------------------------------------------------------------- */

/** ¿El día AAAA-MM-DD todavía se puede agendar, cambiar o cancelar? */
export function esFechaReservable(clave: string, primerDiaPermitido: string): boolean {
  return clave >= primerDiaPermitido;
}

/** "hasta las 23:59 del miércoles 11 de noviembre" */
export function textoPlazo(clave: string, anticipacionMinimaDias: number): string {
  return `hasta las 23:59 del ${formatoFechaLarga(sumarDias(fechaDesdeClave(clave), -anticipacionMinimaDias))}`;
}

export function textoRegla(anticipacionMinimaDias: number): string {
  if (anticipacionMinimaDias === 0) return 'Puedes agendar, cambiar o cancelar hasta las 23:59 del mismo día.';
  if (anticipacionMinimaDias === 1) return 'Puedes agendar, cambiar o cancelar hasta las 23:59 del día anterior.';
  return `Puedes agendar, cambiar o cancelar hasta las 23:59 de ${anticipacionMinimaDias} días antes.`;
}
