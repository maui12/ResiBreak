import {
  contabilidadMock,
  pedidosMock,
} from './pedidos.mock';

import type {
  ContabilidadComida,
  PedidoReparto,
} from './pedidos.types';

export interface ResumenPedidos {
  totalRaciones: number;
  /** Con las dos confirmaciones: proveedor y residente. */
  repartidas: number;
  /** Confirmadas por una sola de las partes. */
  parcialmenteRepartidas: number;
  porRepartir: number;
  montoTotal: number;
}

export interface DatosPedidos {
  contabilidad: ContabilidadComida[];
  pedidos: PedidoReparto[];
  resumen: ResumenPedidos;
}

export async function obtenerDatosPedidos(): Promise<DatosPedidos> {
  const totalRaciones = contabilidadMock.reduce(
    (total, comida) => total + comida.cantidad,
    0,
  );

  const montoTotal = contabilidadMock.reduce(
    (total, comida) =>
      total + comida.cantidad * comida.valorUnitario,
    0,
  );

  // Valores de seguimiento de ejemplo del mockup.
  return {
    contabilidad: contabilidadMock,
    pedidos: pedidosMock,
    resumen: {
      totalRaciones,
      repartidas: 40,
      parcialmenteRepartidas: 8,
      porRepartir: 45,
      montoTotal,
    },
  };
}