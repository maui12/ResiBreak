/**
 * Catálogo de la pantalla "Configuración" (el mismo de la app móvil, constants/configuracion.ts).
 * Para agregar una opción: columna en api/src/configuracion/configuracion.entity.ts, campo en
 * api/src/configuracion/dto/actualizar-configuracion.dto.ts, en `Configuracion`
 * (services/admin.service.ts) y aquí. Los límites deben coincidir con los del DTO.
 */
import type { ClaveConfiguracion } from '../../../services/admin.service';
import { formatoNumero, formatoPesos } from '../../../utils/formato';

/** `entero`: número sin decimales. `moneda`: pesos chilenos (acepta "6.500"). */
export type TipoCampo = 'entero' | 'moneda';

export interface CampoConfiguracion {
  clave: ClaveConfiguracion;
  etiqueta: string;
  ayuda: string;
  tipo: TipoCampo;
  min: number;
  max: number;
  unidad?: string;
}

export const SECCIONES: readonly { titulo: string; descripcion: string; campos: readonly CampoConfiguracion[] }[] = [
  {
    titulo: 'Reglas de turnos',
    descripcion: 'Rigen para todo el sistema desde el momento en que se guardan.',
    campos: [
      {
        clave: 'maxTurnosMes',
        etiqueta: 'Máximo de turnos por mes',
        ayuda: 'Los becados que superen esta cantidad en un mes aparecen como alerta en el Panel. No les impide agendar.',
        tipo: 'entero',
        min: 1,
        max: 31,
        unidad: 'turnos',
      },
      {
        clave: 'anticipacionMinimaDias',
        etiqueta: 'Anticipación mínima',
        ayuda:
          'Días de anticipación para agendar, cambiar o cancelar un pedido (hora de Chile). Con 1, el becado puede hacerlo hasta las 23:59 del día anterior; con 0, hasta las 23:59 del mismo día.',
        tipo: 'entero',
        min: 0,
        max: 30,
        unidad: 'días',
      },
    ],
  },
  {
    titulo: 'Costo por comida',
    descripcion:
      'En pesos chilenos. El nuevo valor se aplica a los pedidos que se agenden desde ahora; los ya agendados conservan su precio.',
    campos: [
      { clave: 'costoDesayuno', etiqueta: 'Desayuno', ayuda: 'Costo de un desayuno.', tipo: 'moneda', min: 0, max: 1_000_000 },
      { clave: 'costoAlmuerzo', etiqueta: 'Almuerzo', ayuda: 'Costo de un almuerzo.', tipo: 'moneda', min: 0, max: 1_000_000 },
      { clave: 'costoOnce', etiqueta: 'Once', ayuda: 'Costo de una once.', tipo: 'moneda', min: 0, max: 1_000_000 },
      { clave: 'costoCena', etiqueta: 'Cena', ayuda: 'Costo de una cena.', tipo: 'moneda', min: 0, max: 1_000_000 },
    ],
  },
];

export const CAMPOS: readonly CampoConfiguracion[] = SECCIONES.flatMap((s) => s.campos);

/** "$6.500", "2 días" */
export function mostrarValor(campo: CampoConfiguracion, valor: number): string {
  if (campo.tipo === 'moneda') return formatoPesos(valor);
  return campo.unidad ? `${formatoNumero(valor)} ${campo.unidad}` : formatoNumero(valor);
}

/** Interpreta lo escrito: el valor, o el motivo por el que no es válido. */
export function interpretarTexto(
  campo: CampoConfiguracion,
  texto: string,
): { valor: number; error: null } | { valor: null; error: string } {
  const limpio = campo.tipo === 'moneda' ? texto.trim().replace(/^\$/, '').replace(/\./g, '') : texto.trim();
  if (limpio === '') return { valor: null, error: 'Ingresa un valor.' };
  if (!/^\d+$/.test(limpio)) return { valor: null, error: 'Debe ser un número entero, sin decimales.' };
  const valor = Number(limpio);
  if (valor < campo.min) return { valor: null, error: `El mínimo es ${mostrarValor(campo, campo.min)}.` };
  if (valor > campo.max) return { valor: null, error: `El máximo es ${mostrarValor(campo, campo.max)}.` };
  return { valor, error: null };
}
