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
  /** Con las dos confirmaciones: proveedor y residente. */
  comidasRepartidas: number;
  /** Confirmadas solo por el proveedor o solo por el residente. */
  comidasParcialmenteRepartidas: number;
  becadosActivos: number;
  /** Becados con más turnos que `maxTurnosMes` en el mes. */
  becadosSobreLimite: number;
  maxTurnosMes: number;
  /** De mayor a menor. */
  comidasPorEspecialidad: { especialidad: string; cantidad: number }[];
  /** Siempre los cuatro tipos de comida. */
  contabilidad: { tipo: TipoComida; cantidad: number; total: number }[];
  /** Entregas confirmadas por el proveedor, por el residente y por ambos, por tipo de comida. */
  conciliacion: {
    porTipo: {
      tipoComida: TipoComida;
      programadas: number;
      entregadasProveedor: number;
      confirmadasResidente: number;
      conciliadas: number;
      soloProveedor: number;
      soloResidente: number;
      montoConciliado: number;
    }[];
    total: { programadas: number; entregadasProveedor: number; confirmadasResidente: number; conciliadas: number; montoConciliado: number };
  };
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

/* --------------------------------- Pedidos --------------------------------- */

/** programado = nadie confirmó; parcial = falta una de las partes; repartido = proveedor y residente confirmaron. */
export type EstadoReparto = 'programado' | 'parcial' | 'repartido';

export const NOMBRE_ESTADO_REPARTO: Record<EstadoReparto, string> = {
  programado: 'Programado',
  parcial: 'Parcialmente repartido',
  repartido: 'Repartido',
};

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
  /** Marca del proveedor: basta una comida pendiente para que el día esté pendiente. */
  estado: EstadoComida;
  estadoReparto: EstadoReparto;
  /** Cuántas de las comidas del día confirmó cada parte. */
  confirmaciones: { proveedor: number; residente: number };
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

/* --------------------------------- Informes -------------------------------- */

/** Totales de un tipo de comida en un hospital, con las confirmaciones de entrega. */
export interface InformeComida {
  tipoComida: TipoComida;
  programadas: number;
  entregadasProveedor: number;
  confirmadasResidente: number;
  conciliadas: number;
  montoProgramado: number;
  montoConciliado: number;
}

/** Una fila de GET /informes/hospitales (los pedidos cancelados no cuentan). */
export interface InformeHospital {
  hospital: string;
  turnos: number;
  comidas: number;
  monto: number;
  /** Marcadas como entregadas por el proveedor. */
  entregadas: number;
  /** Confirmadas por el residente. */
  recibidas: number;
  /** Con las dos confirmaciones. */
  conciliadas: number;
  montoConciliado: number;
  porTipo: InformeComida[];
}

/** Turnos, comidas y montos por hospital de entrega entre dos fechas AAAA-MM-DD (incluidas). */
export function obtenerInformeHospitales(desde: string, hasta: string): Promise<InformeHospital[]> {
  return peticion<InformeHospital[]>('/informes/hospitales', { consulta: { desde, hasta } });
}
