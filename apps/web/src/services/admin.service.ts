/**
 * Endpoints de las pantallas de administración (los mismos que usa la app móvil):
 *
 *   GET/PUT /configuracion                      reglas y costos             (PUT solo admin)
 *   GET /panel/resumen?anio&mes                 métricas del mes
 *   GET /becados?anio&mes                       becados activos con su resumen del mes
 *   GET /pedidos?anio&mes                       lista de reparto del mes
 *   GET /calendario?anio&mes                    tipo de cada día y turnos registrados
 *   GET /informes/hospitales?desde&hasta        turnos, comidas y montos por hospital
 *   GET /notificaciones, /notificaciones/no-leidas; PATCH .../leida, /leer-todas (solo admin)
 *   GET/POST/PATCH/DELETE /turnos-disponibles   tipos de turno              (escribir: solo admin)
 */
import { api, consulta } from '../utils/api';
import type { EstadoComida, TipoComida, TurnoDisponible } from './comun';

const json = (metodo: string, cuerpo?: unknown): RequestInit => ({
  method: metodo,
  body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
});

/* ------------------------------ Configuración ------------------------------ */

export interface Configuracion {
  maxTurnosMes: number;
  /** 1 = hasta las 23:59 del día anterior. */
  anticipacionMinimaDias: number;
  costoDesayuno: number;
  costoAlmuerzo: number;
  costoOnce: number;
  costoCena: number;
  actualizadoEn: string;
}

export type ClaveConfiguracion = Exclude<keyof Configuracion, 'actualizadoEn'>;

export const obtenerConfiguracion = () => api<Configuracion>('/configuracion');

export const actualizarConfiguracion = (cambios: Partial<Record<ClaveConfiguracion, number>>) =>
  api<Configuracion>('/configuracion', json('PUT', cambios));

/* ---------------------------------- Panel ---------------------------------- */

export interface TotalesConciliacion {
  programadas: number;
  entregadasProveedor: number;
  confirmadasResidente: number;
  conciliadas: number;
  soloProveedor: number;
  soloResidente: number;
  montoConciliado: number;
}

export interface ResumenPanel {
  gastoMes: number;
  comidasProgramadas: number;
  /** Con las dos confirmaciones: proveedor y residente. */
  comidasRepartidas: number;
  /** Confirmadas solo por una de las partes. */
  comidasParcialmenteRepartidas: number;
  becadosActivos: number;
  becadosSobreLimite: number;
  maxTurnosMes: number;
  comidasPorEspecialidad: { especialidad: string; cantidad: number }[];
  contabilidad: { tipo: TipoComida; cantidad: number; total: number }[];
  conciliacion: {
    porTipo: (TotalesConciliacion & { tipoComida: TipoComida })[];
    total: TotalesConciliacion;
  };
}

export const obtenerResumenPanel = (anio: number, mes: number) =>
  api<ResumenPanel>(`/panel/resumen${consulta({ anio, mes })}`);

/* --------------------------------- Becados --------------------------------- */

export interface BecadoResumen {
  id: number;
  nombre: string;
  rut: string | null;
  especialidad: string;
  turnos: number;
  /** Turnos en sábado, domingo o feriado. */
  turnosLargos: number;
  comidas: number;
  monto: number;
  /** Tipos de comida distintos que pidió (0 a 4). */
  tiposComida: number;
}

export const obtenerBecados = (anio: number, mes: number) =>
  api<BecadoResumen[]>(`/becados${consulta({ anio, mes })}`);

/* --------------------------------- Pedidos --------------------------------- */

/** programado = nadie confirmó; parcial = falta una parte; repartido = proveedor y residente confirmaron. */
export type EstadoReparto = 'programado' | 'parcial' | 'repartido';

export const NOMBRE_ESTADO_REPARTO: Record<EstadoReparto, string> = {
  programado: 'Programado',
  parcial: 'Parcialmente repartido',
  repartido: 'Repartido',
};

export interface PedidoReparto {
  becadoId: number;
  becado: string;
  hospitalId: number;
  hospital: string;
  turno: { id: number; nombre: string; horaInicio: string; horaFin: string } | null;
  fecha: string;
  dia: number;
  comidas: TipoComida[];
  estado: EstadoComida;
  estadoReparto: EstadoReparto;
  /** Cuántas de las comidas del día confirmó cada parte. */
  confirmaciones: { proveedor: number; residente: number };
}

export const obtenerPedidosReparto = (anio: number, mes: number) =>
  api<PedidoReparto[]>(`/pedidos${consulta({ anio, mes })}`);

/* -------------------------------- Calendario ------------------------------- */

export interface DiaCalendario {
  fecha: string;
  dia: number;
  /** Sábado, domingo o feriado = '24h'. */
  tipo: 'normal' | '24h';
  /** Becados con turno ese día. */
  turnos: number;
}

export const obtenerCalendario = (anio: number, mes: number) =>
  api<{ anio: number; mes: number; dias: DiaCalendario[] }>(`/calendario${consulta({ anio, mes })}`);

export interface Feriado {
  id: number;
  fecha: string;
  nombre: string;
}

export const obtenerFeriados = (anio: number) => api<Feriado[]>(`/calendario/feriados${consulta({ anio })}`);

/* --------------------------------- Informes -------------------------------- */

export interface InformeComida {
  tipoComida: TipoComida;
  programadas: number;
  entregadasProveedor: number;
  confirmadasResidente: number;
  conciliadas: number;
  montoProgramado: number;
  montoConciliado: number;
}

export interface InformeHospital {
  hospital: string;
  turnos: number;
  comidas: number;
  monto: number;
  entregadas: number;
  recibidas: number;
  conciliadas: number;
  montoConciliado: number;
  porTipo: InformeComida[];
}

export const obtenerInformeHospitales = (desde: string, hasta: string) =>
  api<InformeHospital[]>(`/informes/hospitales${consulta({ desde, hasta })}`);

/* ------------------------------ Notificaciones ----------------------------- */

export interface Notificacion {
  id: number;
  tipo: 'pedido_cancelado';
  titulo: string;
  mensaje: string;
  becadoId: number | null;
  fechaPedido: string | null;
  datos: { comidas?: TipoComida[]; hospital?: string | null; turno?: string | null; motivo?: string | null } | null;
  leida: boolean;
  leidaEn: string | null;
  creadoEn: string;
}

export interface PaginaNotificaciones {
  items: Notificacion[];
  total: number;
  noLeidas: number;
  pagina: number;
  limite: number;
}

export const obtenerNotificaciones = (opciones: { soloNoLeidas?: boolean; pagina?: number; limite?: number } = {}) =>
  api<PaginaNotificaciones>(
    `/notificaciones${consulta({
      soloNoLeidas: opciones.soloNoLeidas ? 'true' : undefined,
      pagina: opciones.pagina,
      limite: opciones.limite,
    })}`,
  );

export const contarNotificacionesNoLeidas = async () =>
  (await api<{ noLeidas: number }>('/notificaciones/no-leidas')).noLeidas;

export const marcarNotificacionLeida = (id: number) => api<Notificacion>(`/notificaciones/${id}/leida`, json('PATCH'));

export const marcarTodasLeidas = () => api<{ marcadas: number }>('/notificaciones/leer-todas', json('PATCH'));

/* ------------------------------ Tipos de turno ----------------------------- */

export interface TipoTurno extends TurnoDisponible {
  especialidades: string[];
  activo: boolean;
  actualizadoEn: string;
}

/** Lo que se envía al crear o editar. `fechaFin: null` = sin fecha de término. */
export type DatosTipoTurno = Omit<TipoTurno, 'id' | 'activo' | 'actualizadoEn'>;

export const obtenerTiposTurno = () => api<TipoTurno[]>('/turnos-disponibles');

export const obtenerTipoTurno = (id: number) => api<TipoTurno>(`/turnos-disponibles/${id}`);

/** Especialidades de los becados activos y de los turnos existentes, sin repetir. */
export const obtenerEspecialidades = () => api<string[]>('/turnos-disponibles/especialidades');

export const crearTipoTurno = (datos: DatosTipoTurno) => api<TipoTurno>('/turnos-disponibles', json('POST', datos));

export const actualizarTipoTurno = (id: number, datos: Partial<DatosTipoTurno>) =>
  api<TipoTurno>(`/turnos-disponibles/${id}`, json('PATCH', datos));

/** Deja de ofrecerse a los becados; los pedidos ya agendados con él no cambian. */
export const eliminarTipoTurno = (id: number) => api<void>(`/turnos-disponibles/${id}`, json('DELETE'));

/** Mensaje para mostrar a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Ocurrió un error inesperado. Inténtalo nuevamente.';
}
