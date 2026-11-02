import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../auth/usuario.entity.js';
import { Becado } from '../becados/becado.entity.js';
import { Hospital } from '../hospitales/hospital.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { InformesController } from './informes.controller.js';
import { InformesService } from './informes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Becado, Hospital, Turno, Pedido])],
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}
