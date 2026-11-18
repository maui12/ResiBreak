import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { Rol, Roles } from '../common/roles.js';
import { UsuarioActual } from '../common/usuario-actual.js';
import { ListarNotificacionesQueryDto } from './dto/notificaciones.dto.js';
import { NotificacionesService } from './notificaciones.service.js';

/** Avisos para administración (por ejemplo, cuando un residente cancela un pedido). */
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  /** GET /api/notificaciones?soloNoLeidas=true&pagina=1&limite=20 */
  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @Get()
  listar(@Query() q: ListarNotificacionesQueryDto) {
    return this.notificaciones.listar(q);
  }

  /** GET /api/notificaciones/no-leidas: { noLeidas }. La app la consulta cada cierto tiempo para el globo. */
  @Roles(Rol.ADMIN, Rol.CONSULTA)
  @SkipThrottle()
  @Get('no-leidas')
  noLeidas() {
    return this.notificaciones.contarNoLeidas();
  }

  /** PATCH /api/notificaciones/leer-todas */
  @Roles(Rol.ADMIN)
  @Patch('leer-todas')
  leerTodas(@UsuarioActual() u: JwtPayload) {
    return this.notificaciones.marcarTodasLeidas(Number(u.sub));
  }

  /** PATCH /api/notificaciones/:id/leida */
  @Roles(Rol.ADMIN)
  @Patch(':id/leida')
  marcarLeida(@Param('id', ParseIntPipe) id: number, @UsuarioActual() u: JwtPayload) {
    return this.notificaciones.marcarLeida(id, Number(u.sub));
  }
}
