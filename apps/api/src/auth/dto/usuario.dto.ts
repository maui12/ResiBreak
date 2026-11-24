import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Rol } from '../../common/roles.js';
import { normalizarRut } from '../../common/rut.js';
import { EsRut } from '../../common/validators.js';

/** Largo mínimo de toda contraseña (inicial, de residentes, proveedores y restablecidas). */
export const LARGO_MINIMO_CLAVE = 12;
const MENSAJE_CLAVE = `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres`;

const aRut = ({ value }: { value: unknown }) => (typeof value === 'string' ? normalizarRut(value) : value);
const aTexto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
/** Correo en minúsculas; "" => null (sirve para borrarlo al editar). */
const aCorreo = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() || null : value);

/** Grupos de la pantalla "Administrar usuarios". Administradores incluye a los de solo consulta. */
export const TIPOS_USUARIO = ['residentes', 'administradores', 'proveedores'] as const;
export type TipoUsuario = (typeof TIPOS_USUARIO)[number];
export const ROLES_POR_TIPO: Record<TipoUsuario, Rol[]> = {
  residentes: [Rol.RESIDENTE],
  administradores: [Rol.ADMIN, Rol.CONSULTA],
  proveedores: [Rol.PROVEEDOR],
};

export class CrearUsuarioDto {
  @Transform(aRut)
  @EsRut()
  rut: string;

  /**
   * Opcional: sin contraseña, la cuenta no puede entrar hasta recibir la clave temporal del correo
   * de bienvenida (o hasta que el admin le asigne una).
   */
  @IsOptional() @IsString() @MinLength(LARGO_MINIMO_CLAVE, { message: MENSAJE_CLAVE }) @MaxLength(72)
  password?: string;

  @IsEnum(Rol)
  rol: Rol;

  /** Nombre de administradores, consulta y proveedores (el de los residentes va en su ficha). */
  @IsOptional() @Transform(aTexto) @IsString() @MinLength(1) @MaxLength(120)
  nombre?: string;

  @IsOptional() @Transform(aCorreo) @IsEmail({}, { message: 'email debe ser un correo válido' }) @MaxLength(254)
  email?: string | null;

  /** Obligatorio si rol = residente; prohibido en los demás roles. */
  @IsOptional() @IsInt() @Min(1)
  becadoId?: number;

  /** Solo para roles que no son residente (los residentes eligen el hospital en cada pedido). */
  @IsOptional() @IsInt() @Min(1)
  hospitalId?: number;
}

/** Alta manual de un residente: crea su ficha y su cuenta de una vez. */
export class CrearResidenteDto {
  @Transform(aTexto)
  @IsString() @MinLength(1, { message: 'El nombre es obligatorio' }) @MaxLength(120)
  nombre: string;

  @Transform(aRut)
  @EsRut()
  rut: string;

  /** Una existente o una nueva (se compara sin mayúsculas ni tildes con las registradas). */
  @Transform(aTexto)
  @IsString() @MinLength(1, { message: 'La especialidad es obligatoria' }) @MaxLength(100)
  especialidad: string;

  @Transform(aCorreo)
  @IsEmail({}, { message: 'email debe ser un correo válido' }) @MaxLength(254)
  email: string;
}

export class ListarUsuariosQueryDto {
  @IsOptional() @IsIn(TIPOS_USUARIO)
  tipo?: TipoUsuario;
}

export class ActualizarUsuarioDto {
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsString() @MinLength(LARGO_MINIMO_CLAVE, { message: MENSAJE_CLAVE }) @MaxLength(72)
  password?: string;

  /** En residentes cambia el nombre de su ficha. */
  @IsOptional() @Transform(aTexto) @IsString() @MinLength(1, { message: 'El nombre no puede quedar vacío' }) @MaxLength(120)
  nombre?: string;

  /** null o "" lo borra. */
  @IsOptional() @Transform(aCorreo)
  @ValidateIf((_o, v) => v !== null)
  @IsEmail({}, { message: 'email debe ser un correo válido' }) @MaxLength(254)
  email?: string | null;

  /** Solo residentes. */
  @IsOptional() @Transform(aTexto) @IsString() @MinLength(1, { message: 'La especialidad no puede quedar vacía' }) @MaxLength(100)
  especialidad?: string;

  /** Solo entre administrador y consulta. */
  @IsOptional() @IsIn([Rol.ADMIN, Rol.CONSULTA])
  rol?: Rol.ADMIN | Rol.CONSULTA;
}
