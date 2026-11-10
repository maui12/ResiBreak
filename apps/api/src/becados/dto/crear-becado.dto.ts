import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizarRut } from '../../common/rut.js';
import { EsRut } from '../../common/validators.js';

export class CrearBecadoDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  nombre: string;

  /** Acepta "12.345.678-5" o "12345678-5"; se guarda normalizado. */
  @Transform(({ value }) => (typeof value === 'string' ? normalizarRut(value) : value))
  @EsRut()
  rut: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  especialidad: string;
}
