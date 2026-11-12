import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configurarApp, OPCIONES_APP } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, OPCIONES_APP);
  const config = app.get(ConfigService);

  // Prefijo /api, helmet, CORS, límite del cuerpo, proxy, validación y filtro de errores.
  // Debe ir ANTES de app.listen(): si no, las rutas quedan registradas sin prefijo ni validación.
  configurarApp(app);

  app.enableShutdownHooks();

  const puerto = Number(config.get('PORT') ?? 3000);
  await app.listen(puerto, config.get<string>('HOST') ?? '0.0.0.0');
  Logger.log(`API escuchando en el puerto ${puerto} (prefijo /api)`, 'Bootstrap');
}
await bootstrap();
