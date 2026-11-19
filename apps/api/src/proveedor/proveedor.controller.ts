import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { Rol, Roles } from '../common/roles.js';
import { UsuarioActual } from '../common/usuario-actual.js';
import { HistorialQueryDto, PedidosQueryDto, PendientesQueryDto, TotalesQueryDto } from './dto/proveedor.dto.js';
import { ProveedorService } from './proveedor.service.js';

@Roles(Rol.PROVEEDOR, Rol.ADMIN)
@Controller('proveedor')
export class ProveedorController {
  constructor(private readonly proveedor: ProveedorService) {}

  /** GET /api/proveedor/resumen: comidas de hoy y de los próximos 7 días. */
  @Get('resumen')
  resumen() {
    return this.proveedor.resumen();
  }

  /** GET /api/proveedor/pedidos?fecha=AAAA-MM-DD&tipoComida=almuerzo: detalle de un día (por defecto, hoy). */
  @Get('pedidos')
  pedidos(@Query() q: PedidosQueryDto) {
    return this.proveedor.pedidosPorFecha(q.fecha, q.tipoComida);
  }

  /** GET /api/proveedor/pendientes?dias=7: lo que falta entregar hoy y los próximos días (nombre y hospital). */
  @Get('pendientes')
  pendientes(@Query() q: PendientesQueryDto) {
    return this.proveedor.pendientes(q.dias);
  }

  /** GET /api/proveedor/totales?desde&hasta: comidas confirmadas por proveedor, residente y ambos, por tipo. */
  @Get('totales')
  totales(@Query() q: TotalesQueryDto) {
    return this.proveedor.totales(q);
  }

  /** GET /api/proveedor/historial?desde=&hasta=&tipoComida=&estado=&pagina=&limite= */
  @Get('historial')
  historial(@Query() q: HistorialQueryDto) {
    return this.proveedor.historial(q);
  }

  /** PATCH /api/proveedor/pedidos/:id/entregar */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Patch('pedidos/:id/entregar')
  entregar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: JwtPayload) {
    return this.proveedor.marcarEntregado(id, Number(usuario.sub));
  }
}
