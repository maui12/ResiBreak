import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Rol } from '../../common/roles.js';
import { normalizarRut } from '../../common/rut.js';
import { EsRut } from '../../common/validators.js';

export class CrearUsuarioDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizarRut(value) : value))
  @EsRut()
  rut: string;

  @IsString() @MinLength(10) @MaxLength(72)
  password: string;

  @IsEnum(Rol)
  rol: Rol;

  /** Obligatorio si rol = residente; prohibido en los demás roles. */
  @IsOptional() @IsInt() @Min(1)
  becadoId?: number;

  /** Solo para roles que no son residente (en residente se toma de la ficha del becado). */
  @IsOptional() @IsInt() @Min(1)
  hospitalId?: number;
}

export class ActualizarUsuarioDto {
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsString() @MinLength(10) @MaxLength(72)
  password?: string;
}