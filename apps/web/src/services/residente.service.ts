/**
 * Servicio del residente (los mismos endpoints que la app móvil). El backend sabe quién es el
 * residente por el token, así que nunca se envía su id.
 *
 *   GET   /hospitales                           hospitales de entrega
 *   GET   /residente/resumen                    datos del residente y reglas
 *   GET   /residente/turnos-disponibles         turnos que puede agendar según su especialidad
 *   GET   /residente/pedidos?vista=proximos     comidas de hoy en adelante
 *   GET   /residente/calendario?anio&mes        cada día: feriado y si ya tiene pedido
 *   POST  /residente/pedidos/agendar            { fecha, hospitalId, turnoDisponibleId }
 *   PUT   /residente/pedidos/reprogramar        { fechaActual, fechaNueva?, hospitalId?, turnoDisponibleId? }
 *   PATCH /residente/pedidos/cancelar           { fecha, motivo? }
 *   GET   /residente/recepciones                por confirmar y totales del mes
 *   PATCH /residente/pedidos/:id/recibido       confirma que recibió una comida
 */
import { api, consulta } from '../utils/api';
import { TIPOS_COMIDA, type EstadoComida, type Hospital, type TipoComida, type TurnoDisponible } from './comun';

export const NOMBRE_ESTADO: Record<EstadoComida, string> = {
  pendiente: 'Programado',
  entregado: 'Repartido',
  cancelado: 'Cancelado',
};

export interface TurnoDelPedido {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
}

export interface ReglasAgendamiento {
  /** 1 = se puede agendar, cambiar o cancelar hasta las 23:59 del día anterior. */
  anticipacionMinimaDias: number;
  maxDiasAnticipacion: number;
  /** Primer día permitido según el servidor (hora de Chile), AAAA-MM-DD. */
  primerDiaPermitido: string;
  horaLimite: string;
}

export interface ComidaPedida {
  id: number;
  fecha: string;
  tipoComida: TipoComida;
  estado: EstadoComida;
  entregadoProveedor: boolean;
  recibido: boolean;
  recibidoEn: string | null;
  hospitalId: number;
  hospital: string | null;
  turnoDisponible: TurnoDelPedido | null;
}

/** Un día con pedido: sus comidas (no canceladas), el turno y el hospital. */
export interface PedidoDia {
  fecha: string;
  hospitalId: number;
  hospital: string;
  turno: TurnoDelPedido | null;
  comidas: ComidaPedida[];
  /** Basta una comida pendiente para que el día esté programado. */
  estado: 'pendiente' | 'entregado';
}

export interface DatosResidente {
  hoy: string;
  residente: { nombre: string; especialidad: string };
  reglas: ReglasAgendamiento;
  hospitales: Hospital[];
  turnosDisponibles: TurnoDisponible[];
  pedidos: PedidoDia[];
}

export interface DiaDelMes {
  fecha: string;
  dia: number;
  feriado: boolean;
  conPedido: boolean;
}

function agruparPorDia(comidas: ComidaPedida[], hospitales: Hospital[]): PedidoDia[] {
  const porFecha = new Map<string, ComidaPedida[]>();
  for (const c of comidas) {
    if (c.estado === 'cancelado') continue;
    porFecha.set(c.fecha, [...(porFecha.get(c.fecha) ?? []), c]);
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, lista]) => {
      const ordenadas = [...lista].sort((a, b) => TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida));
      const primera = ordenadas[0];
      return {
        fecha,
        hospitalId: primera.hospitalId,
        hospital: primera.hospital ?? hospitales.find((h) => h.id === primera.hospitalId)?.nombre ?? '—',
        turno: primera.turnoDisponible,
        comidas: ordenadas,
        estado: ordenadas.some((c) => c.estado === 'pendiente') ? 'pendiente' : 'entregado',
      };
    });
}

export async function obtenerDatosResidente(): Promise<DatosResidente> {
  const [resumen, pedidos, hospitales, turnosDisponibles] = await Promise.all([
    api<{ hoy: string; becado: { nombre: string; especialidad: string }; reglas: ReglasAgendamiento }>('/residente/resumen'),
    api<{ items: ComidaPedida[] }>(`/residente/pedidos${consulta({ vista: 'proximos' })}`),
    api<Hospital[]>('/hospitales'),
    api<TurnoDisponible[]>('/residente/turnos-disponibles'),
  ]);
  return {
    hoy: resumen.hoy,
    residente: { nombre: resumen.becado.nombre, especialidad: resumen.becado.especialidad },
    reglas: resumen.reglas,
    hospitales,
    turnosDisponibles,
    pedidos: agruparPorDia(pedidos.items, hospitales),
  };
}

export async function obtenerDiasDelMes(anio: number, mes: number): Promise<DiaDelMes[]> {
  return (await api<{ dias: DiaDelMes[] }>(`/residente/calendario${consulta({ anio, mes })}`)).dias;
}

export function agendarPedido(datos: { fecha: string; hospitalId: number; turnoDisponibleId: number }) {
  return api<unknown>('/residente/pedidos/agendar', { method: 'POST', body: JSON.stringify(datos) });
}

export function reprogramarPedido(datos: {
  fechaActual: string;
  fechaNueva?: string;
  hospitalId?: number;
  turnoDisponibleId?: number;
}) {
  return api<unknown>('/residente/pedidos/reprogramar', { method: 'PUT', body: JSON.stringify(datos) });
}

export function cancelarPedido(fecha: string, motivo?: string) {
  const cuerpo = motivo?.trim() ? { fecha, motivo: motivo.trim() } : { fecha };
  return api<{ fecha: string; estado: 'cancelado'; comidas: TipoComida[]; administracionNotificada: boolean }>(
    '/residente/pedidos/cancelar',
    { method: 'PATCH', body: JSON.stringify(cuerpo) },
  );
}

/** Cantidades del mes por tipo de comida. Sin montos: el residente no ve precios. */
export interface TotalComidaResidente {
  tipoComida: TipoComida;
  programadas: number;
  entregadasProveedor: number;
  confirmadasResidente: number;
  conciliadas: number;
  soloProveedor: number;
  soloResidente: number;
}

export interface Recepciones {
  hoy: string;
  diasParaConfirmar: number;
  porConfirmar: ComidaPedida[];
  totales: { desde: string; hasta: string; porTipo: TotalComidaResidente[]; total: Omit<TotalComidaResidente, 'tipoComida'> };
}

export const obtenerRecepciones = () => api<Recepciones>('/residente/recepciones');

export const confirmarRecepcion = (id: number) => api<ComidaPedida>(`/residente/pedidos/${id}/recibido`, { method: 'PATCH' });
