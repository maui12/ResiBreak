/**
 * Servicio del administrador: endpoints que usan las pantallas de admin de la app móvil.
 *
 *   GET /configuracion             reglas y costos vigentes            (admin, consulta)
 *   PUT /configuracion             cambia solo los campos enviados     (admin)
 *   GET /panel/resumen?anio&mes    métricas del mes para el Panel      (admin, consulta)
 *   GET /becados?anio&mes          becados activos con su resumen      (admin, consulta)
 *   GET /notificaciones            avisos (cancelaciones de pedidos)   (admin, consulta)
 *   GET /notificaciones/no-leidas  cantidad sin leer                   (admin, consulta)
 *   PATCH /notificaciones/:id/leida, /notificaciones/leer-todas        (admin)
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
  /** 1 = hasta las 23:59 del día anterior. */
  anticipacionMinimaDias: number;
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

/* ------------------------------ Notificaciones ------------------------------ */

export interface Notificacion {
  id: number;
  tipo: 'pedido_cancelado';
  titulo: string;
  mensaje: string;
  becadoId: number | null;
  /** Día del pedido (AAAA-MM-DD). */
  fechaPedido: string | null;
  datos: { comidas?: TipoComida[]; hospital?: string | null; turno?: string | null; motivo?: string | null } | null;
  leida: boolean;
  leidaEn: string | null;
  /** Fecha y hora (ISO) en que se generó el aviso. */
  creadoEn: string;
}

export interface PaginaNotificaciones {
  items: Notificacion[];
  total: number;
  noLeidas: number;
  pagina: number;
  limite: number;
}

export function obtenerNotificaciones(opciones: { soloNoLeidas?: boolean; pagina?: number; limite?: number } = {}) {
  return peticion<PaginaNotificaciones>('/notificaciones', {
    consulta: {
      soloNoLeidas: opciones.soloNoLeidas ? 'true' : undefined,
      pagina: opciones.pagina,
      limite: opciones.limite,
    },
  });
}

export async function contarNotificacionesNoLeidas(): Promise<number> {
  return (await peticion<{ noLeidas: number }>('/notificaciones/no-leidas')).noLeidas;
}

export function marcarNotificacionLeida(id: number): Promise<Notificacion> {
  return peticion<Notificacion>(`/notificaciones/${id}/leida`, { metodo: 'PATCH' });
}

export function marcarTodasLeidas(): Promise<{ marcadas: number }> {
  return peticion<{ marcadas: number }>('/notificaciones/leer-todas', { metodo: 'PATCH' });
}
