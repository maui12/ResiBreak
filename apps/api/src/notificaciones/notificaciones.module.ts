import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacion } from './notificacion.entity.js';
import { NotificacionesController } from './notificaciones.controller.js';
import { NotificacionesService } from './notificaciones.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion])],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
