import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TIPOS_COMIDA, type TipoComida } from '../../common/comidas.js';
import { FechaISO } from '../../common/validators.js';
import { DIAS_SEMANA, type DiaSemana } from '../disponibilidad.js';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const recortarLista = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value;

/** POST /api/turnos-disponibles */
export class CrearTurnoDisponibleDto {
  @Transform(recortar)
  @IsString() @IsNotEmpty() @MaxLength(80)
  nombre: string;

  /** Primer día de la vigencia (AAAA-MM-DD). */
  @FechaISO()
  fechaInicio: string;

  /** Último día de la vigencia. Sin enviar (o null) = sin fecha de término. */
  @IsOptional() @FechaISO()
  fechaFin?: string | null;

  /** HH:MM, 24 horas. */
  @Matches(HORA, { message: 'horaInicio debe tener formato HH:MM (24 horas)' })
  horaInicio: string;

  /** HH:MM. Si es menor o igual que horaInicio, el turno termina al día siguiente. */
  @Matches(HORA, { message: 'horaFin debe tener formato HH:MM (24 horas)' })
  horaFin: string;

  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsIn([...TIPOS_COMIDA], { each: true })
  comidas: TipoComida[];

  /** Días de la semana en que no se puede agendar: domingo, lunes, martes, miercoles, jueves, viernes, sabado. */
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(6) @IsIn([...DIAS_SEMANA], { each: true })
  diasNoDisponibles?: DiaSemana[];

  @IsOptional() @IsBoolean()
  excluirFeriados?: boolean;

  /** Especialidades para las que está disponible (como se escriben en la ficha del becado). */
  @Transform(recortarLista)
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsString({ each: true }) @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  especialidades: string[];
}

/** PATCH /api/turnos-disponibles/:id: cualquier campo, y también reactivar un turno eliminado. */
export class ActualizarTurnoDisponibleDto extends PartialType(CrearTurnoDisponibleDto) {
  @IsOptional() @IsBoolean()
  activo?: boolean;
}

/** GET /api/turnos-disponibles?especialidad=&incluirInactivos= */
export class ListarTurnosDisponiblesQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  especialidad?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  incluirInactivos?: boolean;
}
