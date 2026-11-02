import { Controller, Get, Query, Body, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type {JwtPayload} from '../auth/jwt-payload.js';
import {Rol, Roles} from '../common/roles.js';
import {UsuarioActual} from '../common/usuario-actual.js';
import { CrearPedidoDto , ListarPedidosQueryDto} from './dto/informe-query.dto.js';
import { InformeQueryDto } from './dto/informe-query.dto.js';
import { InformesService } from './informes.service.js';

@Controller('informes')
export class InformesController {
  constructor(private readonly informes: InformesService) {}

  /** GET /api/informes/hospitales?desde=2026-06-01&hasta=2026-06-30 */
  @Get('hospitales')
  porHospital(@Query() q: InformeQueryDto) {
    return this.informes.porHospital(q);
  }
}
