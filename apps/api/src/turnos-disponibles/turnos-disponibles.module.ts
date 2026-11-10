import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnoDisponible } from './turno-disponible.entity.js';
import { TurnosDisponiblesController } from './turnos-disponibles.controller.js';
import { TurnosDisponiblesService } from './turnos-disponibles.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TurnoDisponible])],
  controllers: [TurnosDisponiblesController],
  providers: [TurnosDisponiblesService],
  exports: [TurnosDisponiblesService],
})
export class TurnosDisponiblesModule {}
