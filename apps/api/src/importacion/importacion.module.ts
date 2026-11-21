import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../auth/usuario.entity.js';
import { Becado } from '../becados/becado.entity.js';
import { TurnosDisponiblesModule } from '../turnos-disponibles/turnos-disponibles.module.js';
import { ImportacionController } from './importacion.controller.js';
import { ImportacionService } from './importacion.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Becado, Usuario]), TurnosDisponiblesModule],
  controllers: [ImportacionController],
  providers: [ImportacionService],
})
export class ImportacionModule {}
