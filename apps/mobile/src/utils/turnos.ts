/**
 * Reglas y textos de los turnos disponibles. Son las mismas reglas que valida el backend
 * (api/src/turnos-disponibles/disponibilidad.ts); aquí sirven para habilitar días en el calendario.
 */
import type { DiaSemana, TurnoDisponible } from '../services/becados.service';
import { fechaDesdeClave } from './fechas';

/** En el orden de Date#getDay(): 0 = domingo. */
export const DIAS_SEMANA: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/** Para mostrar la semana empezando el lunes. */
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

/* ------------------------- Horario (formulario de admin) ------------------------- */

/** HH:MM en 24 horas, igual que el backend. */
export const esHoraValida = (hora: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

/** Mientras se escribe: "8" -> "8", "080" -> "08:0", "0800" -> "08:00". */
export function mascaraHora(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
}

const minutosDe = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/**
 * Minutos que dura un turno, o null si alguna hora no es válida. Si la hora de fin es menor o
 * igual que la de inicio, el turno termina al día siguiente (misma hora = 24 h).
 */
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

/** Duración lista para mostrar ("10 h"), o null si las horas no son válidas. */
export function duracionTurno(turno: Pick<TurnoDisponible, 'horaInicio' | 'horaFin'>): string | null {
  const minutos = duracionMinutos(turno.horaInicio, turno.horaFin);
  return minutos === null ? null : textoDuracion(minutos);
}

/* ------------------------------- Especialidades ------------------------------- */

const SIN_TILDE: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

/**
 * Para comparar especialidades como lo hace el backend: "Medicína  interna" = "medicina interna".
 * (Sin String#normalize, que depende de Intl en Hermes.)
 */
export function claveEspecialidad(especialidad: string): string {
  return especialidad
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (letra) => SIN_TILDE[letra]);
}
