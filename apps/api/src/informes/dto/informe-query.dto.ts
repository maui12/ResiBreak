import {IsIn, IsOptional, Matches} from 'class-validator';
import { FECHA_ISO} from '../../common/fecha-chile.js';
import {TIPOS_COMIDA, type TipoComida} from '../../common/comidas.js';

export class InformeQueryDto {
  @Matches(FECHA_ISO, {message: 'fecha debe tener formato AAAA-MM-DD'})
  fecha:string;

  @IsIn(TIPOS_COMIDA)
  tipoComida:TipoComida;
}

export class listarPedidosQueryDto {
  @IsOptional()
  @IsIn(['proximos', 'historial'])
  vista?: 'proximos' | 'historial';
}
