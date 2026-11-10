import { Body, Controller, Get, Post } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { CrearHospitalDto } from './dto/crear-hospital.dto.js';
import { HospitalesService } from './hospitales.service.js';

@Controller('hospitales')
export class HospitalesController {
  constructor(private readonly hospitales: HospitalesService) {}

  /** Los residentes también la necesitan: eligen el hospital de entrega en cada pedido. */
  @Roles(Rol.ADMIN, Rol.CONSULTA, Rol.RESIDENTE)
  @Get()
  listar() {
    return this.hospitales.listar();
  }

  @Roles(Rol.ADMIN,Rol.CONSULTA)
  @Post()
  crear(@Body() dto: CrearHospitalDto) {
    return this.hospitales.crear(dto);
  }
}
