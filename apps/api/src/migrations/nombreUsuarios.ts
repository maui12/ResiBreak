import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nombre de las cuentas que no son residentes (administradores, consulta, proveedores):
 * columna usuarios."nombre". Idempotente, como las demás.
 */
export class NombreUsuarios1795392000000 implements MigrationInterface {
  name = 'NombreUsuarios1795392000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE IF EXISTS "usuarios" ADD COLUMN IF NOT EXISTS "nombre" character varying(120)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE IF EXISTS "usuarios" DROP COLUMN IF EXISTS "nombre"`);
  }
}
