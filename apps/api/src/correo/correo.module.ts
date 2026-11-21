import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorreoController } from './correo.controller.js';
import { crearEnvio } from './correo.config.js';
import { CorreoService } from './correo.service.js';
import { ENVIO } from './envio/envio.js';

const VARIABLES = [
  'NODE_ENV',
  'CORREO_PROVEEDOR',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'CORREO_REMITENTE',
] as const;

/**
 * Envío de correos, independiente del proveedor. Para usarlo en otro módulo:
 *   imports: [CorreoModule]   y luego inyectar CorreoService.
 */
@Module({
  controllers: [CorreoController],
  providers: [
    {
      provide: ENVIO,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        crearEnvio(Object.fromEntries(VARIABLES.map((k) => [k, config.get<string>(k)]))),
    },
    CorreoService,
  ],
  exports: [CorreoService],
})
export class CorreoModule {}
