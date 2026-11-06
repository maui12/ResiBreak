import { Body, Controller, Get, Put } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { ConfiguracionService } from './configuracion.service.js';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto.js';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  obtener() {
    return this.configuracion.obtener();
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @Put()
  actualizar(@Body() dto: ActualizarConfiguracionDto) {
    return this.configuracion.actualizar(dto);
  }
}
