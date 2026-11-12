import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import {
  ActualizarTurnoDisponibleDto,
  CrearTurnoDisponibleDto,
  ListarTurnosDisponiblesQueryDto,
} from './dto/turno-disponible.dto.js';
import { TurnosDisponiblesService } from './turnos-disponibles.service.js';

/**
 * Administración de los turnos que pueden agendar los residentes.
 * Los residentes ven los suyos en GET /api/residente/turnos-disponibles.
 */
@Controller('turnos-disponibles')
export class TurnosDisponiblesController {
  constructor(private readonly turnos: TurnosDisponiblesService) {}

  /** GET /api/turnos-disponibles?especialidad=Pediatría&incluirInactivos=true */
  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get()
  listar(@Query() q: ListarTurnosDisponiblesQueryDto) {
    return this.turnos.listar(q);
  }

  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.turnos.obtener(id);
  }

  /** POST /api/turnos-disponibles  { nombre, fechaInicio, fechaFin?, horaInicio, horaFin, comidas, diasNoDisponibles?, excluirFeriados?, especialidades } */
  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearTurnoDisponibleDto) {
    return this.turnos.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarTurnoDisponibleDto) {
    return this.turnos.actualizar(id, dto);
  }

  /** Desactiva el turno (deja de ofrecerse); los pedidos ya agendados no cambian. */
  @Roles(Rol.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.turnos.eliminar(id);
  }
}
