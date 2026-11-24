/** Programado = nadie confirmó; Parcialmente repartido = falta una parte; Repartido = proveedor y residente confirmaron. */
export type EstadoPedido = 'Programado' | 'Parcialmente repartido' | 'Repartido';

export const ESTADOS_PEDIDO: readonly EstadoPedido[] = ['Programado', 'Parcialmente repartido', 'Repartido'];

export type TipoComida =
  | 'Desayunos'
  | 'Almuerzos'
  | 'Onces'
  | 'Cenas';

export interface ContabilidadComida {
  tipo: TipoComida;
  cantidad: number;
  valorUnitario: number;
}

export interface PedidoReparto {
  id: number;
  dia: number;
  becado: string;
  hospital: string;
  comidas: TipoComida[];
  estado: EstadoPedido;
  /** Cuántas de las comidas del día confirmó cada parte. */
  confirmaciones: { proveedor: number; residente: number };
}
