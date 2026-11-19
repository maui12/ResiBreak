import { diaCorto, fechaDesdeClave, sumarDiasClave } from '@/utils/fechas';

/** "Hoy", "Mañana" o "mié 18". */
export function etiquetaDia(clave: string, hoy: string): string {
  if (clave === hoy) return 'Hoy';
  if (clave === sumarDiasClave(hoy, 1)) return 'Mañana';
  const fecha = fechaDesdeClave(clave);
  return `${diaCorto(fecha)} ${fecha.getDate()}`;
}
