export const TIPOS_COMIDA = ['Desayunos', 'Almuerzos', 'Onces', 'Cenas'] as const;
export type TipoComida = (typeof TIPOS_COMIDA)[number];

export const ESTADOS_PEDIDO = ['pendiente', 'entregado', 'cancelado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

/** Qué campo de Configuracion guarda el costo de cada tipo de comida. */
export const CAMPO_COSTO = {
  Desayunos: 'costoDesayuno',
  Almuerzos: 'costoAlmuerzo',
  Onces: 'costoOnce',
  Cenas: 'costoCena',
} as const;
