import { IsIn, IsOptional } from 'class-validator';
import { TIPOS_COMIDA, type TipoComida } from '../../common/comidas.js';
import { FechaISO } from '../../common/validators.js';

/** GET /api/informes/hospitales?desde=2026-06-01&hasta=2026-06-30 */
export class InformeQueryDto {
  @FechaISO()
  desde: string;

  @FechaISO()
  hasta: string;
}

export class CrearPedidoResidenteDto {
  @FechaISO()
  fecha: string;

  @IsIn([...TIPOS_COMIDA])
  tipoComida: TipoComida;
}

export class ListarPedidosResidenteQueryDto {
  @IsOptional()
  @IsIn(['proximos', 'historial'])
  vista?: 'proximos' | 'historial';
}