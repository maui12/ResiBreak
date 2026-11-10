import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { FECHA_ISO } from '../../common/fecha-chile.js';
import { ESTADOS_PEDIDO, TIPOS_COMIDA, type EstadoPedido, type TipoComida } from '../../common/comidas.js';

export class PedidosQueryDto {
  @IsOptional()
  @Matches(FECHA_ISO, { message: 'fecha debe tener formato AAAA-MM-DD' })
  fecha?: string;

  @IsOptional()
  @IsIn([...TIPOS_COMIDA])
  tipoComida?: TipoComida;
}

export class HistorialQueryDto {
  @IsOptional()
  @Matches(FECHA_ISO, { message: 'desde debe tener formato AAAA-MM-DD' })
  desde?: string;

  @IsOptional()
  @Matches(FECHA_ISO, { message: 'hasta debe tener formato AAAA-MM-DD' })
  hasta?: string;

  @IsOptional()
  @IsIn([...TIPOS_COMIDA])
  tipoComida?: TipoComida;

  @IsOptional()
  @IsIn([...ESTADOS_PEDIDO])
  estado?: EstadoPedido;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
