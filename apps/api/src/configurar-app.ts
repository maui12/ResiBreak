//archivo para realizar test e2e
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { QueryFailedFilter } from './common/query-failed.filter.js';

/** Todo lo que la app necesita además de AppModule. Lo usan main.ts y los tests e2e. */
export function configurarApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new QueryFailedFilter());
}