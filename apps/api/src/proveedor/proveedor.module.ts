import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/pedido.entity.js';
import { ProveedorController } from './proveedor.controller.js';
import { ProveedorService } from './proveedor.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido])],
  controllers: [ProveedorController],
  providers: [ProveedorService],
})
export class ProveedorModule {}
