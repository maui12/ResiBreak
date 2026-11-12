import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { MesQueryDto } from './../common/dto/mes-query.dto.js';
import { Rol, Roles } from './../common/roles.js';
import { CambiarEstadoDto, CrearPedidoDto, ListarPedidosQueryDto } from './dto/pedidos.dto.js';
import { PedidosService } from './pedidos.service.js';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get()
  listar(@Query() q: ListarPedidosQueryDto) {
    return this.pedidos.listar(q);
  }

  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get('contabilidad')
  contabilidad(@Query() q: MesQueryDto) {
    return this.pedidos.contabilidad(q);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearPedidoDto) {
    return this.pedidos.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @HttpCode(204)
  @Patch('estado')
  cambiarEstado(@Body() dto: CambiarEstadoDto) {
    return this.pedidos.cambiarEstado(dto);
  }

  @Roles(Rol.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.pedidos.eliminar(id);
  }
}
