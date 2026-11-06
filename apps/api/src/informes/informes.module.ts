import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Becado } from '../becados/becado.entity.js';
import { ConfiguracionModule } from '../configuracion/configuracion.module.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { InformesController } from './informes.controller.js';
import { InformesService } from './informes.service.js';
import { ResidenteController } from './residente.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Becado, Hospital, Turno, Pedido]), ConfiguracionModule],
  controllers: [InformesController, ResidenteController],
  providers: [InformesService],
})
export class InformesModule {}