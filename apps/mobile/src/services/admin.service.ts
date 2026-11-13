/**
 * Servicio del administrador: endpoints que usan las pantallas de admin de la app móvil.
 *
 *   GET /configuracion             reglas y costos vigentes            (admin, consulta)
 *   PUT /configuracion             cambia solo los campos enviados     (admin)
 *   GET /panel/resumen?anio&mes    métricas del mes para el Panel      (admin, consulta)
 *   GET /becados?anio&mes          becados activos con su resumen      (admin, consulta)
 *   GET /pedidos?anio&mes          lista de reparto del mes            (admin, consulta)
 *
 *   GET    /turnos-disponibles                  tipos de turno activos          (admin, consulta)
 *   GET    /turnos-disponibles/especialidades   sugerencias para el formulario  (admin, consulta)
 *   GET    /turnos-disponibles/:id              un tipo de turno                (admin, consulta)
 *   POST   /turnos-disponibles                  crea                            (admin)
 *   PATCH  /turnos-disponibles/:id              edita                           (admin)
 *   DELETE /turnos-disponibles/:id              lo desactiva                    (admin)
 */
import { peticion } from '../api';
import type { EstadoComida, TipoComida, TurnoDisponible } from './becados.service';

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

/* --------------------------------- Pedidos --------------------------------- */

/** Un becado en un día: lo que hay que llevarle y a qué hospital. */
export interface PedidoReparto {
  becadoId: number;
  becado: string;
  hospitalId: number;
  hospital: string;
  /** Turno agendado por el residente; null si el pedido lo cargó administración. */
  turno: { id: number; nombre: string; horaInicio: string; horaFin: string } | null;
  fecha: string; // AAAA-MM-DD
  dia: number;
  /** En el orden desayuno, almuerzo, once, cena. */
  comidas: TipoComida[];
  /** Basta una comida pendiente para que el día esté pendiente. */
  estado: EstadoComida;
}

/** Lista de reparto del mes (sin comidas canceladas), por fecha y becado. `mes` va de 1 a 12. */
export function obtenerPedidosReparto(anio: number, mes: number): Promise<PedidoReparto[]> {
  return peticion<PedidoReparto[]>('/pedidos', { consulta: { anio, mes } });
}

/* ------------------------------ Tipos de turno ------------------------------ */

/** Tipo de turno tal como lo ve administración (lo que agendan los becados). */
export interface TipoTurno extends TurnoDisponible {
  /** Especialidades para las que está disponible. */
  especialidades: string[];
  activo: boolean;
  actualizadoEn: string;
}

/** Lo que se envía al crear o editar. `fechaFin: null` = sin fecha de término. */
export type DatosTipoTurno = Omit<TipoTurno, 'id' | 'activo' | 'actualizadoEn'>;

/** Tipos de turno activos, ordenados por nombre. */
export function obtenerTiposTurno(): Promise<TipoTurno[]> {
  return peticion<TipoTurno[]>('/turnos-disponibles');
}

export function obtenerTipoTurno(id: number): Promise<TipoTurno> {
  return peticion<TipoTurno>(`/turnos-disponibles/${id}`);
}

/** Especialidades de los becados activos y de los turnos existentes, sin repetir. */
export function obtenerEspecialidades(): Promise<string[]> {
  return peticion<string[]>('/turnos-disponibles/especialidades');
}

export function crearTipoTurno(datos: DatosTipoTurno): Promise<TipoTurno> {
  return peticion<TipoTurno>('/turnos-disponibles', { metodo: 'POST', cuerpo: datos });
}

export function actualizarTipoTurno(id: number, datos: Partial<DatosTipoTurno>): Promise<TipoTurno> {
  return peticion<TipoTurno>(`/turnos-disponibles/${id}`, { metodo: 'PATCH', cuerpo: datos });
}

/** Deja de ofrecerse a los becados; los pedidos ya agendados con él no cambian. */
export function eliminarTipoTurno(id: number): Promise<void> {
  return peticion<void>(`/turnos-disponibles/${id}`, { metodo: 'DELETE' });
}
