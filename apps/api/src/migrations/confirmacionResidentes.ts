import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Confirmación de recepción del residente: columna pedidos."recibidoEn".
 *
 * Es idempotente (IF EXISTS / IF NOT EXISTS): no falla si la columna ya la creó DB_SYNC=true en
 * desarrollo, ni si la tabla todavía no existe.
 */
export class ConfirmacionResidente1763500000000 implements MigrationInterface {
  name = 'ConfirmacionResidente1763500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE IF EXISTS "pedidos" ADD COLUMN IF NOT EXISTS "recibidoEn" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE IF EXISTS "pedidos" DROP COLUMN IF EXISTS "recibidoEn"`);
  }
}
