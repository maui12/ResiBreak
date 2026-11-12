import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { QueryFailedFilter } from './common/query-failed.filter.js';

/** Opciones de creación: el body parser se configura a mano (con límite) en configurarApp. */
export const OPCIONES_APP = { bodyParser: false } as const;

/**
 * Todo lo que la app necesita además de AppModule. Lo usan main.ts y los tests e2e,
 * así se prueba exactamente lo mismo que corre en producción.
 *
 * IMPORTANTE: llamar ANTES de app.listen() / app.init(). Si se llama después, las rutas
 * ya quedaron registradas sin el prefijo /api y sin validación.
 */
export function configurarApp(app: NestExpressApplication, env: NodeJS.ProcessEnv = process.env) {
  // Detrás de nginx/traefik: así req.ip es la IP real del cliente y el throttler
  // (5 intentos de login por minuto) no trata a todos como una sola IP.
  const proxies = Number(env.TRUST_PROXY ?? 0);
  if (proxies > 0) app.set('trust proxy', proxies);

  // Límite del cuerpo: ninguna petición legítima de esta API pesa más que esto.
  const limite = env.BODY_LIMIT ?? '100kb';
  app.useBodyParser('json', { limit: limite });
  app.useBodyParser('urlencoded', { limit: limite, extended: false });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.disable('x-powered-by');

  // Solo los orígenes listados en CORS_ORIGINS (el web). La app móvil nativa no usa CORS.
  const origenes = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origenes,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  // whitelist + forbidNonWhitelisted: rechaza campos que no estén en el DTO.
  // transform: aplica los @Transform (por ejemplo, normalizar el RUT "12.345.678-5" -> "12345678-5").
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new QueryFailedFilter());
}
