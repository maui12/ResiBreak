import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { Rol, Roles } from '../common/roles.js';
import { BecadosService } from './becados.service.js';
import { ActualizarBecadoDto } from './dto/actualizar-becado.dto.js';
import { CrearBecadoDto } from './dto/crear-becado.dto.js';

@Controller('becados')
export class BecadosController {
  constructor(private readonly becados: BecadosService) {}

  @Get()
  listar(@Query() q: MesQueryDto) {
    return this.becados.listarConResumen(q);
  }

  @Get(':id')
  obtener(@Param(':id', ParseIntPipe) id: number) {
    return this.becados.obtener(id);
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @Post()
  crear(@Body() dto: CrearBecadoDto) {
    return this.becados.crear(dto);
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarBecadoDto) {
    return this.becados.actualizar(id, dto);
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @HttpCode(204)
  @Delete(':id')
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.becados.desactivar(id);
  }
}
