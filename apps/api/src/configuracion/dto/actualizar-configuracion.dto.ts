import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ActualizarConfiguracionDto {
  @IsOptional() @IsInt() @Min(1) @Max(31)
  maxTurnosMes?: number;

  /** 1 = hasta las 23:59 del día anterior. Máximo 30 (el tope para agendar hacia adelante). */
  @IsOptional() @IsInt() @Min(0) @Max(30)
  anticipacionMinimaDias?: number;

  @IsOptional() @IsString() @MaxLength(80)
  hospitalActivo?: string;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000)
  costoDesayuno?: number;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000)
  costoAlmuerzo?: number;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000)
  costoOnce?: number;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000)
  costoCena?: number;
}
