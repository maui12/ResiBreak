/** Tipos y nombres compartidos por las vistas de administrador, residente y proveedor. */

export type TipoComida = 'desayuno' | 'almuerzo' | 'once' | 'cena';
export type EstadoComida = 'pendiente' | 'entregado' | 'cancelado';
export type DiaSemana = 'domingo' | 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';

/** En el orden en que se muestran. */
export const TIPOS_COMIDA: readonly TipoComida[] = ['desayuno', 'almuerzo', 'once', 'cena'];

export const NOMBRE_COMIDA: Record<TipoComida, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  once: 'Once',
  cena: 'Cena',
};

export const PLURAL_COMIDA: Record<TipoComida, string> = {
  desayuno: 'Desayunos',
  almuerzo: 'Almuerzos',
  once: 'Onces',
  cena: 'Cenas',
};

/** Turno que ofrece la institución (lo crea administración). */
export interface TurnoDisponible {
  id: number;
  nombre: string;
  fechaInicio: string; // AAAA-MM-DD
  fechaFin: string | null;
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM; si es <= horaInicio, termina al día siguiente
  comidas: TipoComida[];
  diasNoDisponibles: DiaSemana[];
  excluirFeriados: boolean;
}

export interface Hospital {
  id: number;
  nombre: string;
}
