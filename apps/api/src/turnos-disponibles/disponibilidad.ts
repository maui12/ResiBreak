/**
 * Reglas de disponibilidad de un turno. Son funciones puras (sin base de datos), así que se
 * pueden probar solas. La app móvil aplica las mismas reglas para habilitar días en el calendario.
 */

/** En el orden de Date#getDay(): 0 = domingo. */
export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

/** Lo mínimo de un turno que hace falta para decidir si se puede agendar un día. */
export interface ReglasTurno {
  fechaInicio: string;
  fechaFin: string | null;
  diasNoDisponibles: readonly DiaSemana[];
  excluirFeriados: boolean;
}

/** Día de la semana de una fecha AAAA-MM-DD (en UTC, para no depender de la zona del servidor). */
export function diaSemana(fecha: string): DiaSemana {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

const NOMBRE_DIA: Record<DiaSemana, string> = {
  domingo: 'domingos',
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábados',
};

/** AAAA-MM-DD -> DD-MM-AAAA */
const legible = (fecha: string) => fecha.split('-').reverse().join('-');

/** `null` si el turno se puede agendar ese día; si no, el motivo (listo para mostrar). */
export function motivoNoDisponible(turno: ReglasTurno, fecha: string, esFeriado: boolean): string | null {
  if (fecha < turno.fechaInicio) return `El turno está disponible desde el ${legible(turno.fechaInicio)}`;
  if (turno.fechaFin && fecha > turno.fechaFin) {
    return `El turno estuvo disponible hasta el ${legible(turno.fechaFin)}`;
  }
  const dia = diaSemana(fecha);
  if (turno.diasNoDisponibles.includes(dia)) return `El turno no está disponible los ${NOMBRE_DIA[dia]}`;
  if (turno.excluirFeriados && esFeriado) return 'El turno no está disponible en feriados';
  return null;
}

/** "Medicina Interna" = "medicina interna " = "Medicína Interna": sin mayúsculas, tildes ni espacios extra. */
export function normalizarEspecialidad(especialidad: string): string {
  return especialidad
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function aplicaAEspecialidad(turno: { especialidades: readonly string[] }, especialidad: string): boolean {
  const buscada = normalizarEspecialidad(especialidad);
  return turno.especialidades.some((e) => normalizarEspecialidad(e) === buscada);
}
