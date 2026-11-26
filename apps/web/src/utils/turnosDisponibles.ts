/**
 * Reglas y textos de los turnos disponibles. Son las mismas reglas que valida el backend
 * (api/src/turnos-disponibles/disponibilidad.ts); aquí sirven para habilitar días en pantalla.
 */
import type { DiaSemana, TurnoDisponible } from '../services/comun';
import { fechaDesdeClave } from './fechas';

/** En el orden de Date#getDay(): 0 = domingo. */
export const DIAS_SEMANA: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export const DIAS_SEMANA_DESDE_LUNES: DiaSemana[] = [...DIAS_SEMANA.slice(1), 'domingo'];

export const NOMBRE_DIA_CORTO: Record<DiaSemana, string> = {
  domingo: 'Dom',
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
};

const NOMBRE_DIA_PLURAL: Record<DiaSemana, string> = {
  domingo: 'domingos',
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábados',
};

const legible = (fecha: string) => fecha.split('-').reverse().join('-');

/** `null` si el turno se puede agendar ese día; si no, el motivo. */
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

/** HH:MM en 24 horas, igual que el backend. */
export const esHoraValida = (hora: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

const minutosDe = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/** Minutos que dura un turno (si termina más temprano de lo que empieza, termina al día siguiente). */
export function duracionMinutos(horaInicio: string, horaFin: string): number | null {
  if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) return null;
  const diferencia = minutosDe(horaFin) - minutosDe(horaInicio);
  return diferencia > 0 ? diferencia : diferencia + 24 * 60;
}

/** 600 -> "10 h", 570 -> "9 h 30 min", 45 -> "45 min". */
export function textoDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export function duracionTurno(turno: Pick<TurnoDisponible, 'horaInicio' | 'horaFin'>): string | null {
  const minutos = duracionMinutos(turno.horaInicio, turno.horaFin);
  return minutos === null ? null : textoDuracion(minutos);
}

/** Para comparar especialidades como el backend: "Medicína  interna" = "medicina interna". */
export function claveEspecialidad(especialidad: string): string {
  return especialidad
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
