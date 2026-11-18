import { Body, Controller, Get, Put } from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { Rol, Roles } from '../common/roles.js';
import { UsuarioActual } from '../common/usuario-actual.js';
import { ConfiguracionService } from './configuracion.service.js';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto.js';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  /** GET /api/configuracion: reglas y costos vigentes. */
  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get()
  obtener() {
    return this.configuracion.obtener();
  }

  /** PUT /api/configuracion: cambia uno o varios valores (solo los enviados). */
  @Roles(Rol.ADMIN)
  @Put()
  actualizar(@Body() dto: ActualizarConfiguracionDto, @UsuarioActual() usuario: JwtPayload) {
    return this.configuracion.actualizar(dto, Number(usuario.sub));
  }
}
