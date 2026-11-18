/**
 * Servicio del residente: es el único lugar donde la app móvil conoce los endpoints del backend.
 *
 * Usa solo rutas permitidas al rol residente. El backend sabe quién es el residente por el token
 * (trae su becadoId), así que nunca se envía un id de residente.
 *
 *   GET  /hospitales                          hospitales de entrega
 *   GET  /residente/resumen                   datos del residente, reglas y turnos registrados
 *   GET  /residente/turnos-disponibles        turnos que puede agendar según su especialidad
 *   GET  /residente/pedidos?vista=proximos    comidas pedidas de hoy en adelante
 *   GET  /residente/calendario?anio&mes       cada día: feriado y si ya tiene pedido
 *   POST /residente/pedidos/agendar           { fecha, hospitalId, turnoDisponibleId }
 *   PUT  /residente/pedidos/reprogramar       { fechaActual, fechaNueva?, hospitalId?, turnoDisponibleId? }
 *
 * Reglas que aplica el servidor (la app las refleja para guiar a la persona):
 *   - Las comidas las define el turno que se agenda; el residente no las elige.
 *   - Cada turno tiene vigencia, días en que no se puede agendar y especialidades.
 *   - Anticipación mínima (horas, desde las 00:00 del día) para agendar y para cambiar.
 *   - Hasta `maxDiasAnticipacion` días hacia adelante.
 *   - Un pedido por día; el hospital de entrega se elige en cada pedido.
 */
import { peticion } from '../api';

/* ---------------------------- Tipos del front ---------------------------- */

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

export const NOMBRE_ESTADO: Record<EstadoComida, string> = {
  pendiente: 'Programado',
  entregado: 'Repartido',
  cancelado: 'Cancelado',
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

/** Lo que el servidor informa del turno de un pedido ya agendado. */
export interface TurnoDelPedido {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
}

export interface Hospital {
  id: number;
  nombre: string;
}

export interface Residente {
  nombre: string;
  especialidad: string;
}

export interface ReglasAgendamiento {
  /** 1 = se puede agendar, cambiar o cancelar hasta las 23:59 del día anterior. */
  anticipacionMinimaDias: number;
  maxDiasAnticipacion: number;
  /** Primer día permitido según el servidor (hora de Chile) en el momento de la consulta. */
  primerDiaPermitido: string;
  horaLimite: string;
}

export interface ComidaPedida {
  id: number;
  fecha: string; // AAAA-MM-DD
  tipoComida: TipoComida;
  estado: EstadoComida;
  hospitalId: number;
  hospital: string | null;
  turnoDisponible: TurnoDelPedido | null;
}

/** Un día con pedido: sus comidas (no canceladas), el turno y el hospital al que se entregan. */
export interface PedidoDia {
  fecha: string;
  hospitalId: number;
  hospital: string;
  /** null en pedidos cargados por administración o anteriores a los turnos disponibles. */
  turno: TurnoDelPedido | null;
  comidas: ComidaPedida[];
  /** Basta una comida pendiente para que el día esté programado (igual que el backend). */
  estado: 'pendiente' | 'entregado';
}

export interface DatosResidente {
  /** Fecha de hoy según el servidor (hora de Chile), AAAA-MM-DD. */
  hoy: string;
  residente: Residente;
  reglas: ReglasAgendamiento;
  hospitales: Hospital[];
  /** Turnos que puede agendar según su especialidad. */
  turnosDisponibles: TurnoDisponible[];
  /** Pedidos de hoy en adelante, ordenados por fecha. */
  pedidos: PedidoDia[];
}

export interface DiaDelMes {
  fecha: string; // AAAA-MM-DD
  dia: number;
  feriado: boolean;
  /** Ya tiene un pedido ese día. */
  conPedido: boolean;
}

/* ------------------------- Formas que devuelve la API ------------------------- */

interface ResumenApi {
  hoy: string;
  becado: Residente;
  reglas: ReglasAgendamiento;
}

interface PedidosApi {
  items: ComidaPedida[];
}

/* ------------------------------- Lecturas ------------------------------- */

/** Agrupa las comidas (no canceladas) por día. */
function agruparPorDia(comidas: ComidaPedida[], hospitales: Hospital[]): PedidoDia[] {
  const porFecha = new Map<string, ComidaPedida[]>();
  for (const comida of comidas) {
    if (comida.estado === 'cancelado') continue;
    porFecha.set(comida.fecha, [...(porFecha.get(comida.fecha) ?? []), comida]);
  }

  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, lista]) => {
      const ordenadas = [...lista].sort(
        (a, b) => TIPOS_COMIDA.indexOf(a.tipoComida) - TIPOS_COMIDA.indexOf(b.tipoComida),
      );
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
    peticion<ResumenApi>('/residente/resumen'),
    peticion<PedidosApi>('/residente/pedidos', { consulta: { vista: 'proximos' } }),
    peticion<Hospital[]>('/hospitales'),
    peticion<TurnoDisponible[]>('/residente/turnos-disponibles'),
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

/** Días de un mes (`mes` de 1 a 12): si son feriado y si el residente ya tiene pedido. */
export async function obtenerDiasDelMes(anio: number, mes: number): Promise<DiaDelMes[]> {
  const respuesta = await peticion<{ dias: DiaDelMes[] }>('/residente/calendario', { consulta: { anio, mes } });
  return respuesta.dias;
}

/* ------------------------------- Escrituras ------------------------------- */

export interface DatosNuevoPedido {
  fecha: string; // AAAA-MM-DD
  hospitalId: number;
  turnoDisponibleId: number;
}

/**
 * Agenda un día con un turno: el servidor registra el turno y las comidas de ese turno en una sola
 * transacción, y valida la anticipación, las restricciones del turno y que el día esté libre.
 */
export async function agendarPedido(datos: DatosNuevoPedido): Promise<void> {
  await peticion('/residente/pedidos/agendar', { metodo: 'POST', cuerpo: datos });
}

export interface DatosCambioPedido {
  /** Día en que está agendado hoy el pedido. */
  fechaActual: string;
  /** Si se indica, el pedido se mueve a ese día. */
  fechaNueva?: string;
  /** Si se indica, el pedido se entrega en ese hospital. */
  hospitalId?: number;
  /** Si se indica, el pedido pasa a ese turno (y recibe sus comidas). */
  turnoDisponibleId?: number;
}

/**
 * Cambia un pedido ya agendado: el día, el hospital, el turno o varios a la vez. El servidor lo hace
 * en una sola transacción y valida la anticipación, las restricciones del turno y que el día nuevo esté libre.
 */
export async function reprogramarPedido(datos: DatosCambioPedido): Promise<void> {
  await peticion('/residente/pedidos/reprogramar', { metodo: 'PUT', cuerpo: datos });
}

export interface ResultadoCancelacion {
  fecha: string;
  estado: 'cancelado';
  comidas: TipoComida[];
  /** El servidor registró el aviso para administración. */
  administracionNotificada: boolean;
}

/**
 * Cancela el pedido completo de un día. El servidor valida el plazo (hasta las 23:59 del día
 * anterior), que no haya comidas entregadas, libera el día y avisa a administración.
 */
export function cancelarPedido(fecha: string, motivo?: string): Promise<ResultadoCancelacion> {
  const cuerpo = motivo?.trim() ? { fecha, motivo: motivo.trim() } : { fecha };
  return peticion<ResultadoCancelacion>('/residente/pedidos/cancelar', { metodo: 'PATCH', cuerpo });
}
