/**
 * DataSource para la CLI de TypeORM (migraciones). La app usa la misma configuración en app.module.ts.
 *
 *   pnpm --filter api build
 *   pnpm --filter api migration:generate src/migrations/NombreDelCambio   # crea la migración a partir de las entidades
 *   pnpm --filter api build && pnpm --filter api migration:run   # aplica las pendientes
 *
 * En producción la API aplica sola las migraciones pendientes al iniciar (DB_MIGRAR=true).
 */
import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';

const env = process.env;

export default new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  // Se ejecuta desde dist/ (código compilado). fileURLToPath: en Windows `.pathname` da "/C:/..." y no encuentra nada.
  entities: [fileURLToPath(new URL('./**/*.entity.js', import.meta.url))],
  migrations: [fileURLToPath(new URL('./migrations/*.js', import.meta.url))],
  synchronize: false,
});
