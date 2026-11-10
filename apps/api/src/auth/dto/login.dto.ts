import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizarRut } from '../../common/rut.js';
import { EsRut } from '../../common/validators.js';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizarRut(value) : value))
  @EsRut()
  rut: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  password: string;
}