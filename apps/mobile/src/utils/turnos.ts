/**
 * Reglas y textos de los turnos disponibles. Son las mismas reglas que valida el backend
 * (api/src/turnos-disponibles/disponibilidad.ts); aquí sirven para habilitar días en el calendario.
 */
import type { DiaSemana, TurnoDisponible } from '../services/becados.service';
import { fechaDesdeClave } from './fechas';

/** En el orden de Date#getDay(): 0 = domingo. */
const DIAS_SEMANA: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const NOMBRE_DIA_PLURAL: Record<DiaSemana, string> = {
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

/** `null` si el turno se puede agendar ese día; si no, el motivo (en minúsculas, para el lector de pantalla). */
export function motivoTurno(
  turno: Pick<TurnoDisponible, 'fechaInicio' | 'fechaFin' | 'diasNoDisponibles' | 'excluirFeriados'>,
  dia: { fecha: string; feriado?: boolean },
): string | null {
  if (dia.fecha < turno.fechaInicio) return `el turno empieza el ${legible(turno.fechaInicio)}`;
  if (turno.fechaFin && dia.fecha > turno.fechaFin) return `el turno terminó el ${legible(turno.fechaFin)}`;
  const nombreDia = DIAS_SEMANA[fechaDesdeClave(dia.fecha).getDay()];
  if (turno.diasNoDisponibles.includes(nombreDia)) return `el turno no está disponible los ${NOMBRE_DIA_PLURAL[nombreDia]}`;
  if (turno.excluirFeriados && dia.feriado) return 'el turno no está disponible en feriados';
  return null;
}

/** "08:00 – 18:00" o "08:00 – 08:00 (día siguiente)". */
export function horarioTurno(turno: Pick<TurnoDisponible, 'horaInicio' | 'horaFin'>): string {
  const siguiente = turno.horaFin <= turno.horaInicio ? ' (día siguiente)' : '';
  return `${turno.horaInicio} – ${turno.horaFin}${siguiente}`;
}

/** "No disponible: sábados, domingos y feriados", o null si no tiene restricciones. */
export function restriccionesTurno(turno: Pick<TurnoDisponible, 'diasNoDisponibles' | 'excluirFeriados'>): string | null {
  const partes = DIAS_SEMANA.filter((d) => turno.diasNoDisponibles.includes(d)).map((d) => NOMBRE_DIA_PLURAL[d]);
  if (turno.excluirFeriados) partes.push('feriados');
  if (partes.length === 0) return null;
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
  return `No disponible: ${lista}`;
}

/** "Hasta el 31-03-2027", o null si no tiene fecha de término. */
export function vigenciaTurno(turno: Pick<TurnoDisponible, 'fechaFin'>): string | null {
  return turno.fechaFin ? `Hasta el ${legible(turno.fechaFin)}` : null;
}
