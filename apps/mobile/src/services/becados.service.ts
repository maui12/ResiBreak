/**
 * Servicio del residente: es el único lugar donde la app móvil conoce los
 * endpoints del backend. Las pantallas solo ven tipos de "residente".
 *
 * El backend todavía los llama "becados" (rutas /becados, campo becadoId).
 * Aquí se traducen esos nombres, así que cuando el backend se renombre solo
 * hay que tocar este archivo.
 *
 * Endpoints que ya existen y se usan:
 *   GET  /hospitales
 *   GET  /configuracion                    (anticipacionMinimaHoras)
 *   GET  /calendario?anio&mes              (tipo de cada día: normal | 24h)
 *   GET  /becados/:id                      (datos del residente)
 *   GET  /turnos?anio&mes&becadoId         (turnos que el residente ya tiene)
 *   GET  /pedidos?anio&mes                 (pedidos agendados)
 *   POST /turnos     { becadoId, fecha }
 *   POST /pedidos    { becadoId, fecha, comidas }
 *   DELETE /turnos/:id                     (deshacer si el pedido falla)
 *
 * Pendiente en el backend para que el flujo funcione con un usuario residente
 * (ver "Puntos pendientes del backend" en la entrega):
 *   - Un rol de residente: hoy POST /turnos y POST /pedidos son solo ADMIN.
 *   - Vincular el usuario con su residente (hoy el token solo trae el id de usuario).
 */
import { peticion } from '../api';
import { obtenerResidenteId } from '../sesion';
import { claveFecha, mesesQueCubre, sumarDias } from '../utils/fechas';

/* ---------------------------- Tipos del front ---------------------------- */

export type TipoComida = 'Desayunos' | 'Almuerzos' | 'Onces' | 'Cenas';
export type EstadoPedido = 'Programado' | 'Repartido';
export type TipoTurno = 'normal' | '24h';

export interface Hospital {
  id: number;
  nombre: string;
}

export interface Residente {
  id: number;
  nombre: string;
  especialidad: string;
  hospital: Hospital;
}

export interface PedidoResidente {
  fecha: string; // AAAA-MM-DD
  dia: number;
  hospital: string;
  comidas: TipoComida[];
  estado: EstadoPedido;
}

export interface TurnoDisponible {
  tipo: TipoTurno;
  nombre: string;
  descripcion: string;
  comidas: TipoComida[];
}

export interface ReglasAgendamiento {
  anticipacionMinimaHoras: number;
}

export interface DiaAgendable {
  fecha: string; // AAAA-MM-DD
  dia: number;
  tipo: TipoTurno; // lo decide el servidor: sábado, domingo o feriado => 24h
  ocupado: boolean; // el residente ya tiene un turno ese día
}

/* ------------------------- Formas que devuelve la API ------------------------- */

interface BecadoApi {
  id: number;
  nombre: string;
  especialidad: string;
  hospital: { id: number; nombre: string };
}

interface PedidoApi {
  becadoId: number;
  hospital: string;
  fecha: string;
  dia: number;
  comidas: TipoComida[];
  estado: EstadoPedido;
}

interface TurnoApi {
  id: number;
  becadoId: number;
  fecha: string;
  tipo: TipoTurno;
}

interface ConfiguracionApi {
  anticipacionMinimaHoras: number;
}

/* ------------------------------- Lecturas ------------------------------- */

export class SesionSinResidenteError extends Error {
  constructor() {
    super('No hay un residente asociado a la sesión.');
    this.name = 'SesionSinResidenteError';
  }
}

export async function obtenerResidenteActual(): Promise<Residente> {
  const id = obtenerResidenteId();
  if (id === null) throw new SesionSinResidenteError();

  const becado = await peticion<BecadoApi>(`/becados/${id}`);
  return {
    id: becado.id,
    nombre: becado.nombre,
    especialidad: becado.especialidad,
    hospital: { id: becado.hospital.id, nombre: becado.hospital.nombre },
  };
}

export function obtenerHospitales(): Promise<Hospital[]> {
  return peticion<Hospital[]>('/hospitales');
}

export async function obtenerReglas(): Promise<ReglasAgendamiento> {
  const configuracion = await peticion<ConfiguracionApi>('/configuracion');
  return { anticipacionMinimaHoras: configuracion.anticipacionMinimaHoras };
}

/** Comidas que incluye cada tipo de turno (mismas combinaciones que usa la web). */
const COMIDAS_POR_TURNO: Record<TipoTurno, TipoComida[]> = {
  normal: ['Almuerzos', 'Onces'],
  '24h': ['Desayunos', 'Almuerzos', 'Onces', 'Cenas'],
};

/**
 * Turnos que puede elegir un residente de una especialidad.
 *
 * TODO(backend): hoy no existe un endpoint de turnos disponibles por especialidad;
 * los únicos tipos de turno que maneja el sistema son "normal" y "24h", y el
 * servidor decide cuál corresponde según el día. Cuando exista (por ejemplo
 * GET /turnos/disponibles?especialidad=...), reemplazar el cuerpo de esta función
 * por la llamada y volverla asíncrona.
 */
export function obtenerTurnosDisponibles(_especialidad: string): TurnoDisponible[] {
  return [
    {
      tipo: 'normal',
      nombre: 'Turno normal',
      descripcion: 'Días hábiles',
      comidas: COMIDAS_POR_TURNO.normal,
    },
    {
      tipo: '24h',
      nombre: 'Guardia de 24 h',
      descripcion: 'Sábados, domingos y feriados',
      comidas: COMIDAS_POR_TURNO['24h'],
    },
  ];
}

/** Días del mes con su tipo, marcando los que el residente ya tiene ocupados. `mes` va de 1 a 12. */
export async function obtenerDiasAgendables(
  anio: number,
  mes: number,
  residenteId: number,
): Promise<DiaAgendable[]> {
  const [calendario, turnos] = await Promise.all([
    peticion<{ dias: { fecha: string; dia: number; tipo: TipoTurno }[] }>('/calendario', {
      consulta: { anio, mes },
    }),
    peticion<TurnoApi[]>('/turnos', { consulta: { anio, mes, becadoId: residenteId } }),
  ]);

  const fechasOcupadas = new Set(turnos.map((turno) => turno.fecha));

  return calendario.dias.map((dia) => ({
    fecha: dia.fecha,
    dia: dia.dia,
    tipo: dia.tipo,
    ocupado: fechasOcupadas.has(dia.fecha),
  }));
}

/**
 * Pedidos del residente en los próximos `dias` días, contando desde `desde` (inclusive).
 *
 * TODO(backend): GET /pedidos devuelve los pedidos de todos los residentes del mes y
 * aquí se filtran. Conviene agregar un filtro `becadoId` (o un endpoint "mis pedidos").
 */
export async function obtenerPedidosProximosDias(
  residenteId: number,
  desde: Date,
  dias = 7,
): Promise<PedidoResidente[]> {
  const hasta = sumarDias(desde, dias - 1);
  const claveDesde = claveFecha(desde);
  const claveHasta = claveFecha(hasta);

  // 7 días pueden cruzar el fin de mes: se piden los meses que toque.
  const respuestas = await Promise.all(
    mesesQueCubre(desde, hasta).map(({ anio, mes }) =>
      peticion<PedidoApi[]>('/pedidos', { consulta: { anio, mes } }),
    ),
  );

  return respuestas
    .flat()
    .filter(
      (pedido) =>
        pedido.becadoId === residenteId && pedido.fecha >= claveDesde && pedido.fecha <= claveHasta,
    )
    .map((pedido) => ({
      fecha: pedido.fecha,
      dia: pedido.dia,
      hospital: pedido.hospital,
      comidas: pedido.comidas,
      estado: pedido.estado,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* ------------------------------- Escrituras ------------------------------- */

export interface DatosNuevoPedido {
  residenteId: number;
  fecha: string; // AAAA-MM-DD
  turno: TurnoDisponible;
  // El hospital elegido en pantalla no se envía: el backend toma el hospital del residente
  // y rechaza campos desconocidos (forbidNonWhitelisted). TODO(backend): aceptar hospitalId.
}

/**
 * Guarda el pedido: primero registra el turno (el servidor valida la anticipación
 * mínima y decide si es normal o 24 h) y luego las comidas de ese día.
 * Si las comidas fallan, intenta deshacer el turno para no dejarlo a medias.
 */
export async function guardarPedido(datos: DatosNuevoPedido): Promise<void> {
  const turno = await peticion<TurnoApi>('/turnos', {
    metodo: 'POST',
    cuerpo: { becadoId: datos.residenteId, fecha: datos.fecha },
  });

  try {
    await peticion('/pedidos', {
      metodo: 'POST',
      cuerpo: {
        becadoId: datos.residenteId,
        fecha: datos.fecha,
        comidas: datos.turno.comidas,
      },
    });
  } catch (error) {
    await peticion(`/turnos/${turno.id}`, { metodo: 'DELETE' }).catch(() => undefined);
    throw error;
  }
}