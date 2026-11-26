import { fechaDesdeClave, sumarDiasClave } from '../../../utils/fechas';

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "Hoy", "Mañana" o "mié 18". */
export function etiquetaDia(clave: string, hoy: string): string {
  if (clave === hoy) return 'Hoy';
  if (clave === sumarDiasClave(hoy, 1)) return 'Mañana';
  const fecha = fechaDesdeClave(clave);
  return `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()}`;
}

/** Mientras la pantalla está abierta se actualiza sola (pedidos nuevos o cancelaciones). */
export const INTERVALO_ACTUALIZACION_MS = 60_000;
