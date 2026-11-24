import type { Repository } from 'typeorm';
import { TIPOS_COMIDA, type TipoComida } from '../common/comidas.js';
import type { Pedido } from './pedido.entity.js';

/**
 * Conciliación de entregas: cuántas comidas de cada tipo confirmó el proveedor, cuántas confirmó
 * el residente y cuántas tienen las dos confirmaciones, con sus montos.
 *
 * Cada tipo de comida se suma por separado y con el precio que quedó guardado en cada pedido
 * (valorUnitario), porque desayuno, almuerzo, once y cena tienen precios distintos y el precio
 * puede cambiar en la configuración sin alterar lo ya pedido.
 */
export interface TotalComida {
  tipoComida: TipoComida;
  /** Comidas pedidas (sin canceladas). */
  programadas: number;
  /** Confirmadas por el proveedor (estado 'entregado'). */
  entregadasProveedor: number;
  /** Confirmadas por el residente en su cuenta. */
  confirmadasResidente: number;
  /** Con las dos confirmaciones: proveedor y residente. Es lo que se considera entregado sin dudas. */
  conciliadas: number;
  /** El proveedor la marcó, pero el residente aún no la confirma. */
  soloProveedor: number;
  /** El residente la confirmó, pero el proveedor no la marcó. */
  soloResidente: number;
  montoProgramado: number;
  montoEntregadoProveedor: number;
  montoConciliado: number;
}

export interface Conciliacion {
  desde: string;
  hasta: string;
  porTipo: TotalComida[];
  total: Omit<TotalComida, 'tipoComida'>;
}

const CAMPOS = [
  'programadas',
  'entregadasProveedor',
  'confirmadasResidente',
  'conciliadas',
  'soloProveedor',
  'soloResidente',
  'montoProgramado',
  'montoEntregadoProveedor',
  'montoConciliado',
] as const;

const SQL = `
  SELECT p."tipoComida" AS "tipoComida",
         COUNT(*)                                                                   AS "programadas",
         COUNT(*) FILTER (WHERE p.estado = 'entregado')                             AS "entregadasProveedor",
         COUNT(*) FILTER (WHERE p."recibidoEn" IS NOT NULL)                         AS "confirmadasResidente",
         COUNT(*) FILTER (WHERE p.estado = 'entregado' AND p."recibidoEn" IS NOT NULL) AS "conciliadas",
         COUNT(*) FILTER (WHERE p.estado = 'entregado' AND p."recibidoEn" IS NULL)  AS "soloProveedor",
         COUNT(*) FILTER (WHERE p.estado = 'pendiente' AND p."recibidoEn" IS NOT NULL) AS "soloResidente",
         COALESCE(SUM(p."valorUnitario"), 0)                                        AS "montoProgramado",
         COALESCE(SUM(p."valorUnitario") FILTER (WHERE p.estado = 'entregado'), 0)  AS "montoEntregadoProveedor",
         COALESCE(SUM(p."valorUnitario") FILTER (WHERE p.estado = 'entregado' AND p."recibidoEn" IS NOT NULL), 0) AS "montoConciliado"
  FROM pedidos p
  WHERE p.estado <> 'cancelado'
    AND p.fecha >= $1 AND p.fecha <= $2
    AND ($3::int IS NULL OR p."becadoId" = $3)
  GROUP BY p."tipoComida"`;

const MONTOS = ['montoProgramado', 'montoEntregadoProveedor', 'montoConciliado'] as const;
type Monto = (typeof MONTOS)[number];
export type TotalComidaSinMontos = Omit<TotalComida, Monto>;

/** Los mismos totales, solo con cantidades: el residente no ve precios ni montos. */
export function sinMontos(c: Conciliacion) {
  const quitar = <T extends Partial<TotalComida>>(t: T) =>
    Object.fromEntries(Object.entries(t).filter(([k]) => !(MONTOS as readonly string[]).includes(k))) as Omit<T, Monto>;
  return { desde: c.desde, hasta: c.hasta, porTipo: c.porTipo.map(quitar), total: quitar(c.total) };
}

/** Totales por tipo de comida entre dos fechas (incluidas). Con `becadoId`, solo los de ese residente. */
export async function conciliar(
  pedidos: Repository<Pedido>,
  desde: string,
  hasta: string,
  becadoId: number | null = null,
): Promise<Conciliacion> {
  const filas = (await pedidos.query(SQL, [desde, hasta, becadoId])) as Record<string, string>[];
  const porTipo: TotalComida[] = TIPOS_COMIDA.map((tipoComida) => {
    const fila = filas.find((f) => f.tipoComida === tipoComida);
    const total = { tipoComida } as TotalComida;
    for (const c of CAMPOS) total[c] = Number(fila?.[c] ?? 0);
    return total;
  });
  const total = Object.fromEntries(CAMPOS.map((c) => [c, porTipo.reduce((s, t) => s + t[c], 0)])) as Conciliacion['total'];
  return { desde, hasta, porTipo, total };
}
