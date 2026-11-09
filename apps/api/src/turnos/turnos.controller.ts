import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { CrearTurnoDto, ListarTurnosQueryDto } from './dto/crear-turno.dto.js';
import { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto.js';
import { TurnosService } from './turnos.service.js';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnos: TurnosService) {}

  @Get()
  listar(@Query() q: ListarTurnosQueryDto) {
    return this.turnos.listar(q);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearTurnoDto) {
    return this.turnos.crear(dto);
  }

  /** PUT /api/turnos/reprogramar — mueve el turno y las comidas de un día a otro, en una sola transacción. */
  @Roles(Rol.ADMIN)
  @Put('reprogramar')
  reprogramar(@Body() dto: ReprogramarTurnoDto) {
    return this.turnos.reprogramar(dto);
  }

  @Roles(Rol.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.turnos.eliminar(id);
  }
}