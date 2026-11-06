import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { TIPOS_COMIDA } from './../../common/comidas.js';
import type { TipoComida } from './../../common/comidas.js';
import { FechaISO } from './../../common/validators.js';

/**
 * Cambia un pedido ya agendado. Se puede cambiar el día, el hospital de entrega o ambos:
 *  - Cambiar el día: enviar `fechaNueva` (distinta de `fechaActual`) y las `comidas` del nuevo día.
 *  - Cambiar el hospital: enviar `hospitalId`.
 */
export class ReprogramarTurnoDto {
  @IsInt() @Min(1)
  becadoId: number;

  /** Día en que está agendado hoy. */
  @FechaISO()
  fechaActual: string;

  /** Día al que se quiere mover (opcional si solo se cambia el hospital). */
  @IsOptional() @FechaISO()
  fechaNueva?: string;

  /** Comidas del nuevo día: dependen de si el día nuevo es normal o de 24 h. Obligatorias si hay `fechaNueva`. */
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsIn([...TIPOS_COMIDA], { each: true })
  comidas?: TipoComida[];

  /** Hospital al que se entrega el pedido. Si no se envía, se conserva el que tenía. */
  @IsOptional() @IsInt() @Min(1)
  hospitalId?: number;
}