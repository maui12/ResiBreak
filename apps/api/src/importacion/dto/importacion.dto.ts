import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { normalizarRut } from '../../common/rut.js';
import { EsRut } from '../../common/validators.js';
import { LARGO_CORREO, LARGO_ESPECIALIDAD, LARGO_NOMBRE, limpiarTexto, MAX_FILAS } from '../excel.js';

const limpiar = ({ value }: { value: unknown }) => (typeof value === 'string' ? limpiarTexto(value) : value);

/** Un residente de la vista previa que el admin decidió conservar. */
export class ResidenteImportarDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizarRut(value.replace(/\s/g, '')) : value))
  @EsRut()
  rut: string;

  @Transform(limpiar)
  @IsString() @MinLength(1, { message: 'El nombre es obligatorio' }) @MaxLength(LARGO_NOMBRE)
  nombre: string;

  @Transform(limpiar)
  @IsString() @MinLength(1, { message: 'La especialidad es obligatoria' }) @MaxLength(LARGO_ESPECIALIDAD)
  especialidad: string;

  /** Opcional: sin correo, el residente se crea igual pero no recibirá el mensaje de bienvenida. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() || null : value))
  @IsOptional()
  @IsEmail({}, { message: 'correo debe ser un correo válido' })
  @MaxLength(LARGO_CORREO)
  correo?: string | null;
}

export class ConfirmarImportacionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'No hay residentes para agregar' })
  @ArrayMaxSize(MAX_FILAS)
  @ValidateNested({ each: true })
  @Type(() => ResidenteImportarDto)
  residentes: ResidenteImportarDto[];
}
