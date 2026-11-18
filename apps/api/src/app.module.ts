import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { BecadosModule } from './becados/becados.module.js';
import { CalendarioModule } from './calendario/calendario.module.js';
import { ConfiguracionModule } from './configuracion/configuracion.module.js';
import { validarEnv } from './env.validation.js';
import { HealthController } from './health/health.controller.js';
import { HospitalesModule } from './hospitales/hospitales.module.js';
import { InformesModule } from './informes/informes.module.js';
import { PanelModule } from './panel/panel.module.js';
import { NotificacionesModule } from './notificaciones/notificaciones.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { ProveedorModule } from './proveedor/proveedor.module.js';
import { TurnosModule } from './turnos/turnos.module.js';
import { TurnosDisponiblesModule } from './turnos-disponibles/turnos-disponibles.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres' as const,
        host: c.getOrThrow<string>('DB_HOST'),
        port: Number(c.getOrThrow('DB_PORT')),
        username: c.getOrThrow<string>('DB_USER'),
        password: c.getOrThrow<string>('DB_PASSWORD'),
        database: c.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        // Solo para desarrollo. En producción: DB_SYNC=false (lo exige env.validation.ts) y migraciones.
        synchronize: c.get<string>('DB_SYNC') === 'true',
        // Migraciones compiladas (dist/migrations). Con DB_MIGRAR=true se aplican las pendientes al iniciar.
        migrations: [new URL('./migrations/*.js', import.meta.url).pathname],
        migrationsRun: c.get<string>('DB_MIGRAR') === 'true',
      }),
    }),
    AuthModule,
    HospitalesModule,
    ConfiguracionModule,
    BecadosModule,
    CalendarioModule,
    TurnosModule,
    TurnosDisponiblesModule,
    PedidosModule,
    PanelModule,
    InformesModule,
    ProveedorModule,
    NotificacionesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
