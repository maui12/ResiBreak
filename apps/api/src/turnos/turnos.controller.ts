import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { CrearTurnoDto, ListarTurnosQueryDto } from './dto/crear-turno.dto.js';
import { TurnosService } from './turnos.service.js';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnos: TurnosService) {}

  @Get()
  listar(@Query() q: ListarTurnosQueryDto) {
    return this.turnos.listar(q);
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @Post()
  crear(@Body() dto: CrearTurnoDto) {
    return this.turnos.crear(dto);
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @HttpCode(204)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.turnos.eliminar(id);
  }
}
