import { NOMBRE_COMIDA, type TipoComida, type TurnoDisponible } from '../../services/comun';
import type { PedidoDia } from '../../services/residente.service';
import { esFechaReservable, fechaDesdeClave, sumarDiasClave } from '../../utils/fechas';
import { horarioTurno, restriccionesTurno } from '../../utils/turnosDisponibles';

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const nombresComidas = (tipos: TipoComida[]) => tipos.map((t) => NOMBRE_COMIDA[t]).join(', ');

/** "Hoy", "Mañana" o "mié 28". */
export function etiquetaDia(clave: string, hoy: string): string {
  if (clave === hoy) return 'Hoy';
  if (clave === sumarDiasClave(hoy, 1)) return 'Mañana';
  const fecha = fechaDesdeClave(clave);
  return `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()}`;
}

/** Horario, comidas, restricciones y vigencia de un turno, para la lista de opciones. */
export function describirTurno(turno: TurnoDisponible, esActual = false): string {
  return [
    esActual ? 'Turno actual del pedido' : null,
    horarioTurno(turno),
    `Comidas: ${nombresComidas(turno.comidas)}`,
    restriccionesTurno(turno),
    turno.fechaFin ? `Hasta el ${turno.fechaFin.split('-').reverse().join('-')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** En plazo y sin comidas entregadas: se puede cambiar o cancelar. */
export const esModificable = (p: PedidoDia, primerDiaPermitido: string) =>
  esFechaReservable(p.fecha, primerDiaPermitido) && p.comidas.every((c) => c.estado === 'pendiente');

export const indiceMes = (m: { anio: number; mes: number }) => m.anio * 12 + m.mes;

/** {anio, mes} de una fecha AAAA-MM-DD. */
export const mesDe = (clave: string) => ({ anio: Number(clave.slice(0, 4)), mes: Number(clave.slice(5, 7)) });
