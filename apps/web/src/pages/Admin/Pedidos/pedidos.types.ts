export type EstadoPedido = 'Repartido' | 'Programado';

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
}