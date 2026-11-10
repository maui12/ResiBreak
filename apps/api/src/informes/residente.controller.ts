import { Body, Controller, Get, Patch, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { MesQueryDto } from '../common/dto/mes-query.dto.js';
import { Rol, Roles } from '../common/roles.js';
import { UsuarioActual } from '../common/usuario-actual.js';
import {
  AgendarPedidoDto,
  CancelarPedidoDto,
  ListarPedidosResidenteQueryDto,
  ReprogramarPedidoDto,
} from './dto/residente.dto.js';
import { ResidenteService } from './residente.service.js';

/** Rutas del residente. Quién es el residente sale siempre del token, nunca del cuerpo de la petición. */
@Roles(Rol.RESIDENTE)
@Controller('residente')
export class ResidenteController {
  constructor(private readonly residente: ResidenteService) {}

  /** GET /api/residente/resumen: datos del residente, reglas, turno de hoy, próximos turnos y comidas de hoy. */
  @Get('resumen')
  resumen(@UsuarioActual() u: JwtPayload) {
    return this.residente.resumen(u.becadoId);
  }

  /** GET /api/residente/turnos-disponibles: turnos que puede agendar según su especialidad. */
  @Get('turnos-disponibles')
  turnosDisponibles(@UsuarioActual() u: JwtPayload) {
    return this.residente.turnosDisponiblesDe(u.becadoId);
  }

  /** GET /api/residente/calendario?anio&mes: tipo de cada día, feriados y si ya tiene turno o pedido. */
  @Get('calendario')
  calendario(@UsuarioActual() u: JwtPayload, @Query() q: MesQueryDto) {
    return this.residente.calendario(u.becadoId, q);
  }

  /** GET /api/residente/pedidos?vista=proximos|historial */
  @Get('pedidos')
  listar(@UsuarioActual() u: JwtPayload, @Query() q: ListarPedidosResidenteQueryDto) {
    return this.residente.listar(u.becadoId, q.vista);
  }

  /** POST /api/residente/pedidos/agendar  { fecha, hospitalId, turnoDisponibleId } */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('pedidos/agendar')
  agendar(@UsuarioActual() u: JwtPayload, @Body() dto: AgendarPedidoDto) {
    return this.residente.agendar(u.becadoId, dto);
  }

  /** PUT /api/residente/pedidos/reprogramar  { fechaActual, fechaNueva?, hospitalId?, turnoDisponibleId? } */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Put('pedidos/reprogramar')
  reprogramar(@UsuarioActual() u: JwtPayload, @Body() dto: ReprogramarPedidoDto) {
    return this.residente.reprogramar(u.becadoId, dto);
  }

  /** PATCH /api/residente/pedidos/cancelar  { fecha }: cancela el pedido completo de ese día. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Patch('pedidos/cancelar')
  cancelar(@UsuarioActual() u: JwtPayload, @Body() dto: CancelarPedidoDto) {
    return this.residente.cancelar(u.becadoId, dto.fecha);
  }
}
