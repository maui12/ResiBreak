export const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'once', 'cena'] as const;
export type TipoComida = (typeof TIPOS_COMIDA)[number];

export const ESTADOS_PEDIDO = ['pendiente', 'entregado', 'cancelado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

/** Qué campo de Configuracion guarda el costo de cada tipo de comida. */
export const CAMPO_COSTO = {
  desayuno: 'costoDesayuno',
  almuerzo: 'costoAlmuerzo',
  once: 'costoOnce',
  cena: 'costoCena',
} as const satisfies Record<TipoComida, string>;