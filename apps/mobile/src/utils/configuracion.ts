/**
 * Cómo se escribe, valida y muestra cada tipo de campo de la configuración.
 * Un tipo nuevo de `TipoCampoConfiguracion` se agrega aquí y en components/admin/CampoConfiguracion.tsx.
 */
import type { CampoConfiguracion } from '../constants/configuracion';
import { formatoNumero, formatoPesos } from './formato';

/** Texto que se pone en el campo a partir del valor guardado. */
export function textoDelValor(_campo: CampoConfiguracion, valor: number): string {
  return String(valor);
}

/** Valor listo para mostrar: "$6.500", "24 horas". */
export function mostrarValor(campo: CampoConfiguracion, valor: number): string {
  if (campo.tipo === 'moneda') return formatoPesos(valor);
  return campo.unidad ? `${formatoNumero(valor)} ${campo.unidad}` : formatoNumero(valor);
}

/** Interpreta lo escrito. Devuelve el valor o el motivo por el que no es válido. */
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
