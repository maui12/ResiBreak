import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Turno } from '../turnos/turno.entity.js';
import { Becado } from './becado.entity.js';
import { BecadosController } from './becados.controller.js';
import { BecadosService } from './becados.service.js';
import { Usuario } from '../auth/usuario.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Becado, Turno, Pedido,Usuario])],
  controllers: [BecadosController],
  providers: [BecadosService],
  exports: [TypeOrmModule],
})
export class BecadosModule {}
