import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches, registerDecorator, type ValidationOptions } from 'class-validator';
import { esRutValido } from './rut.js';

/** Fecha en formato AAAA-MM-DD y que exista de verdad (rechaza 2026-02-30). */
export const FechaISO = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato AAAA-MM-DD' }),
    IsISO8601({ strict: true }),
  );

/** RUT chileno con dígito verificador correcto. */
export function EsRut(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) => {
    registerDecorator({
      name: 'esRut',
      target: objeto.constructor,
      propertyName: propiedad,
      options: { message: 'RUT inválido (ej: 12.345.678-5)', ...opciones },
      validator: { validate: (v: unknown) => typeof v === 'string' && esRutValido(v) },
    });
  };
}