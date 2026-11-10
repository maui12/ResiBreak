import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Prefijo /api, helmet, validación y filtros: lo mismo que usan los tests e2e.
  // Debe ir antes de app.listen(), si no las rutas quedan registradas sin el prefijo.
  configurarApp(app);

  // Solo los orígenes listados en CORS_ORIGINS (el web). La app móvil nativa no usa CORS.
  const origenes = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origenes });

  app.enableShutdownHooks();

  const puerto = Number(config.get('PORT') ?? 3000);
  await app.listen(puerto, config.get<string>('HOST') ?? '0.0.0.0');
  Logger.log(`API escuchando en el puerto ${puerto}`, 'Bootstrap');
}
await bootstrap();
