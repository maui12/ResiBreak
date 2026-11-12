/**
 * Servicio del administrador: endpoints que usan las pantallas de admin de la app móvil.
 *
 *   GET /configuracion             reglas y costos vigentes            (admin, consulta)
 *   PUT /configuracion             cambia solo los campos enviados     (admin)
 *   GET /panel/resumen?anio&mes    métricas del mes para el Panel      (admin, consulta)
 *   GET /becados?anio&mes          becados activos con su resumen      (admin, consulta)
 */
import { peticion } from '../api';
import type { TipoComida } from './becados.service';

/* ------------------------------ Configuración ------------------------------ */

/**
 * Configuración del sistema. Para agregar una nueva: sumarla aquí y en el catálogo
 * de src/constants/configuracion.ts (ver el comentario de ese archivo).
 */
export interface Configuracion {
  maxTurnosMes: number;
  anticipacionMinimaHoras: number;
  costoDesayuno: number;
  costoAlmuerzo: number;
  costoOnce: number;
  costoCena: number;
  /** Fecha y hora (ISO) del último cambio. */
  actualizadoEn: string;
}

/** Campos que se pueden editar. */
export type ClaveConfiguracion = Exclude<keyof Configuracion, 'actualizadoEn'>;

export function obtenerConfiguracion(): Promise<Configuracion> {
  return peticion<Configuracion>('/configuracion');
}

/** Guarda solo los campos indicados y devuelve la configuración resultante. */
export function actualizarConfiguracion(cambios: Partial<Record<ClaveConfiguracion, number>>): Promise<Configuracion> {
  return peticion<Configuracion>('/configuracion', { metodo: 'PUT', cuerpo: cambios });
}

/* ---------------------------------- Panel ---------------------------------- */

export interface ResumenPanel {
  /** Suma de los pedidos del mes (sin cancelados), en pesos. */
  gastoMes: number;
  /** Comidas del mes sin cancelar (pendientes + repartidas). */
  comidasProgramadas: number;
  comidasRepartidas: number;
  becadosActivos: number;
  /** Becados con más turnos que `maxTurnosMes` en el mes. */
  becadosSobreLimite: number;
  maxTurnosMes: number;
  /** De mayor a menor. */
  comidasPorEspecialidad: { especialidad: string; cantidad: number }[];
  /** Siempre los cuatro tipos de comida. */
  contabilidad: { tipo: TipoComida; cantidad: number; total: number }[];
}

/** `mes` va de 1 a 12. */
export function obtenerResumenPanel(anio: number, mes: number): Promise<ResumenPanel> {
  return peticion<ResumenPanel>('/panel/resumen', { consulta: { anio, mes } });
}

/* --------------------------------- Becados --------------------------------- */

/** Un becado activo con lo que tuvo en el mes consultado (sin contar pedidos cancelados). */
export interface BecadoResumen {
  id: number;
  nombre: string;
  /** null en fichas antiguas creadas antes de este campo. */
  rut: string | null;
  especialidad: string;
  turnos: number;
  /** Turnos en sábado, domingo o feriado. */
  turnosLargos: number;
  comidas: number;
  /** Suma de sus pedidos, en pesos. */
  monto: number;
  /** Cuántos tipos de comida distintos pidió (0 a 4). */
  tiposComida: number;
}

/** Becados activos ordenados por nombre. `mes` va de 1 a 12. */
export function obtenerBecados(anio: number, mes: number): Promise<BecadoResumen[]> {
  return peticion<BecadoResumen[]>('/becados', { consulta: { anio, mes } });
}
