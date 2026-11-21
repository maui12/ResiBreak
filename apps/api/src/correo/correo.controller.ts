import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { Rol, Roles } from '../common/roles.js';
import { CorreoService } from './correo.service.js';

export class CorreoPruebaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'para debe ser un correo válido' })
  @MaxLength(254)
  para: string;
}

@Roles(Rol.ADMIN)
@Controller('correo')
export class CorreoController {
  constructor(private readonly correo: CorreoService) {}

  /**
   * POST /api/correo/prueba  { para }: comprueba la configuración enviando un correo de prueba.
   * Responde { enviado, proveedor }. Con CORREO_PROVEEDOR=consola no envía nada (solo lo registra).
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('prueba')
  prueba(@Body() dto: CorreoPruebaDto) {
    return this.correo.enviarPrueba(dto.para);
  }
}
