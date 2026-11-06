import { Controller, Get, Query } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { InformeQueryDto } from './dto/informe-query.dto.js';
import { InformesService } from './informes.service.js';

@Roles(Rol.ADMIN, Rol.CONSULTA)
@Controller('informes')
export class InformesController {
  constructor(private readonly informes: InformesService) {}

  /** GET /api/informes/hospitales?desde=2026-06-01&hasta=2026-06-30 */
  @Get('hospitales')
  porHospital(@Query() q: InformeQueryDto) {
    return this.informes.porHospital(q);
  }
}