import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { Rol, Roles } from '../common/roles.js';
import { CalendarioService } from './calendario.service.js';
import { CrearFeriadoDto, FeriadosQueryDto } from './dto/crear-feriado.dto.js';

@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendario: CalendarioService) {}

  /** GET /api/calendario?anio=2026&mes=6 */
  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get()
  mes(@Query() q: MesQueryDto) {
    return this.calendario.obtenerMes(q);
  }

  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get('feriados')
  feriados(@Query() q: FeriadosQueryDto) {
    return this.calendario.listarFeriados(q.anio);
  }

  @Roles(Rol.ADMIN)
  @Post('feriados')
  crearFeriado(@Body() dto: CrearFeriadoDto) {
    return this.calendario.crearFeriado(dto);
  }

  @Roles(Rol.ADMIN)
  @HttpCode(204)
  @Delete('feriados/:id')
  eliminarFeriado(@Param('id', ParseIntPipe) id: number) {
    return this.calendario.eliminarFeriado(id);
  }
}
