// Se ejecuta antes de cargar la app: ConfigModule lee estas variables.
process.env.TZ = 'America/Santiago';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5433';
process.env.DB_USER ??= 'becadozzz';
process.env.DB_PASSWORD ??= 'becadozzz';
process.env.DB_NAME ??= 'becados_test';
process.env.DB_SYNC = 'true';
process.env.JWT_SECRET = 'secreto-solo-para-tests-'.padEnd(40, 'x');
process.env.ADMIN_RUT = '11111111-1';
process.env.ADMIN_PASSWORD = 'clave-admin-de-pruebas';

// Seguro de vida: los tests borran datos, jamás deben apuntar a la BD real.
if (!process.env.DB_NAME.endsWith('_test')) {
  throw new Error(`Los e2e solo corren contra una BD cuyo nombre termine en "_test" (actual: ${process.env.DB_NAME})`);
}