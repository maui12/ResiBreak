import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { QueryFailedFilter } from './common/query-failed.filter.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);


  //Descomentar app. cuando termine de hacer los tests
  //app.setGlobalPrefix('api');
  //app.use(helmet());

  // Solo los orígenes listados en CORS_ORIGINS (el web). La app móvil nativa no usa CORS.
  const origenes = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origenes });

  //app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  //app.useGlobalFilters(new QueryFailedFilter());
  app.enableShutdownHooks();

  const puerto = Number(config.get('PORT') ?? 3000);
  await app.listen(puerto, config.get<string>('HOST') ?? '0.0.0.0');
  Logger.log(`API escuchando en el puerto ${puerto}`, 'Bootstrap');
  configurarApp(app);
}
await bootstrap();
