import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Becado } from '../becados/becado.entity.js';
import { CalendarioModule } from '../calendario/calendario.module.js';
import { ConfiguracionModule } from '../configuracion/configuracion.module.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { TurnosDisponiblesModule } from '../turnos-disponibles/turnos-disponibles.module.js';
import { InformesController } from './informes.controller.js';
import { InformesService } from './informes.service.js';
import { ResidenteController } from './residente.controller.js';
import { ResidenteService } from './residente.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Becado, Hospital, Turno, Pedido]), ConfiguracionModule, CalendarioModule, TurnosDisponiblesModule],
  controllers: [InformesController, ResidenteController],
  providers: [InformesService, ResidenteService],
})
export class InformesModule {}
