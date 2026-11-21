import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correo de los usuarios y marca de cambio de contraseña (carga de residentes desde Excel):
 * columnas usuarios."email" (única, opcional) y usuarios."debeCambiarClave".
 *
 * Es idempotente: no falla si DB_SYNC=true ya creó las columnas en desarrollo, ni si la tabla
 * todavía no existe.
 */
export class CorreoUsuarios1795132800000 implements MigrationInterface {
  name = 'CorreoUsuarios1795132800000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE IF EXISTS "usuarios" ADD COLUMN IF NOT EXISTS "email" character varying(254)`);
    await q.query(
      `ALTER TABLE IF EXISTS "usuarios" ADD COLUMN IF NOT EXISTS "debeCambiarClave" boolean NOT NULL DEFAULT false`,
    );
    await q.query(`
      DO $$ BEGIN
        IF to_regclass('public.usuarios') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_usuarios_email') THEN
          ALTER TABLE "usuarios" ADD CONSTRAINT "UQ_usuarios_email" UNIQUE ("email");
        END IF;
      END $$;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE IF EXISTS "usuarios" DROP CONSTRAINT IF EXISTS "UQ_usuarios_email"`);
    await q.query(`ALTER TABLE IF EXISTS "usuarios" DROP COLUMN IF EXISTS "debeCambiarClave"`);
    await q.query(`ALTER TABLE IF EXISTS "usuarios" DROP COLUMN IF EXISTS "email"`);
  }
}
