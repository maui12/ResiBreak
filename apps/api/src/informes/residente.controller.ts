import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { Rol, Roles } from '../common/roles.js';
import { UsuarioActual } from '../common/usuario-actual.js';
import { CrearPedidoResidenteDto, ListarPedidosResidenteQueryDto } from './dto/informe-query.dto.js';
import { InformesService } from './informes.service.js';

@Roles(Rol.RESIDENTE)
@Controller('residente')
export class ResidenteController {
  constructor(private readonly informes: InformesService) {}

  /** GET /api/residente/resumen: turno de hoy, próximos turnos y comidas de hoy. */
  @Get('resumen')
  resumen(@UsuarioActual() u: JwtPayload) {
    return this.informes.resumen(u.becadoId);
  }

  /** GET /api/residente/pedidos?vista=proximos|historial */
  @Get('pedidos')
  listar(@UsuarioActual() u: JwtPayload, @Query() q: ListarPedidosResidenteQueryDto) {
    return this.informes.listar(u.becadoId, q.vista);
  }

  /** POST /api/residente/pedidos  { fecha, tipoComida } */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('pedidos')
  crear(@UsuarioActual() u: JwtPayload, @Body() dto: CrearPedidoResidenteDto) {
    return this.informes.crear(u.becadoId, dto);
  }

  /** PATCH /api/residente/pedidos/:id/cancelar */
  @Patch('pedidos/:id/cancelar')
  cancelar(@UsuarioActual() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.informes.cancelar(u.becadoId, id);
  }
}