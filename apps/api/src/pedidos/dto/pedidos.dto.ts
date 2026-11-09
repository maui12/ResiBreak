import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ESTADOS_PEDIDO, TIPOS_COMIDA } from './../../common/comidas.js';
import type { EstadoPedido, TipoComida } from './../../common/comidas.js';
import { MesQueryDto } from '../../common/dto/mes-query.dto.js';
import { FechaISO } from '../../common/validators.js';

export class CrearPedidoDto {
  @IsInt() @Min(1)
  becadoId: number;

  @FechaISO()
  fecha: string;

  @IsArray() @ArrayNotEmpty() @IsIn([...TIPOS_COMIDA], { each: true })
  comidas: TipoComida[];

  /** Hospital de entrega. Si no se indica, se usa el hospital del becado. */
  @IsOptional() @IsInt() @Min(1)
  hospitalId?: number;
}

/** Marca como Repartido/Programado todas las comidas de un becado en un día. */
export class CambiarEstadoDto {
  @IsInt() @Min(1)
  becadoId: number;

  @FechaISO()
  fecha: string;

  @IsIn([...ESTADOS_PEDIDO])
  estado: EstadoPedido;
}

export class ListarPedidosQueryDto extends MesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  hospitalId?: number;

  @IsOptional() @IsIn([...ESTADOS_PEDIDO])
  estado?: EstadoPedido;
}