import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Rol } from '../../common/roles.js';
import { normalizarRut } from '../../common/rut.js';
import { EsRut } from '../../common/validators.js';

/** Largo mínimo de toda contraseña (inicial, de residentes, proveedores y restablecidas). */
export const LARGO_MINIMO_CLAVE = 12;

export class CrearUsuarioDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizarRut(value) : value))
  @EsRut()
  rut: string;

  @IsString() @MinLength(LARGO_MINIMO_CLAVE, { message: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres` }) @MaxLength(72)
  password: string;

  @IsEnum(Rol)
  rol: Rol;

  /** Obligatorio si rol = residente; prohibido en los demás roles. */
  @IsOptional() @IsInt() @Min(1)
  becadoId?: number;

  /** Solo para roles que no son residente (los residentes eligen el hospital en cada pedido). */
  @IsOptional() @IsInt() @Min(1)
  hospitalId?: number;
}

export class ActualizarUsuarioDto {
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsString() @MinLength(LARGO_MINIMO_CLAVE, { message: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres` }) @MaxLength(72)
  password?: string;
}