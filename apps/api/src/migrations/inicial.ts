import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema completo desde cero (generado con migration:generate contra una base vacía).
 * Su fecha es anterior a las demás migraciones para que corra primero en una base nueva; las
 * siguientes quedan sin efecto porque sus columnas ya vienen aquí y usan IF NOT EXISTS.
 *
 * En una base creada antes con DB_SYNC=true (desarrollo) las tablas ya existen: no hace nada.
 */
export class Inicial1763000000000 implements MigrationInterface {
  name = 'Inicial1763000000000';

  public async up(q: QueryRunner): Promise<void> {
    if (await q.hasTable('usuarios')) return;

    await q.query(`CREATE TABLE "becados" ("id" SERIAL NOT NULL, "nombre" character varying(120) NOT NULL, "rut" character varying(12), "especialidad" character varying(100) NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_b746fd7e2ea9e3342fdbf7ab08e" UNIQUE ("rut"), CONSTRAINT "PK_17b844a88d0f7cb63ed9b5f123d" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "hospitales" ("id" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, CONSTRAINT "UQ_48088d87125062604ee335333f9" UNIQUE ("nombre"), CONSTRAINT "PK_2170243d42467fc96e4e9256812" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "rut" character varying(12) NOT NULL, "passwordHash" character varying(100) NOT NULL, "rol" character varying(20) NOT NULL DEFAULT 'residente', "nombre" character varying(120), "email" character varying(254), "debeCambiarClave" boolean NOT NULL DEFAULT false, "becadoId" integer, "hospitalId" integer, "activo" boolean NOT NULL DEFAULT true, "intentosFallidos" integer NOT NULL DEFAULT '0', "bloqueadoHasta" TIMESTAMP WITH TIME ZONE, "ultimoLoginEn" TIMESTAMP WITH TIME ZONE, "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9e90b993976dcd8bdabf4e3159d" UNIQUE ("rut"), CONSTRAINT "UQ_usuarios_email" UNIQUE ("email"), CONSTRAINT "REL_d0e86780d6c25ac1a66c2d7f3f" UNIQUE ("becadoId"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "feriados" ("id" SERIAL NOT NULL, "fecha" date NOT NULL, "nombre" character varying(100) NOT NULL, CONSTRAINT "UQ_b7e24097e75dd79323b0f9af441" UNIQUE ("fecha"), CONSTRAINT "PK_5f85b3ce0b3bcafc6b6f2100209" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "configuracion" ("id" integer NOT NULL, "maxTurnosMes" integer NOT NULL DEFAULT '6', "anticipacionMinimaDias" integer NOT NULL DEFAULT '1', "hospitalActivo" character varying(80) NOT NULL DEFAULT 'Ovalle', "costoDesayuno" integer NOT NULL DEFAULT '4200', "costoAlmuerzo" integer NOT NULL DEFAULT '6500', "costoOnce" integer NOT NULL DEFAULT '3800', "costoCena" integer NOT NULL DEFAULT '6200', "actualizadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_42615c5e55d08746ae5accfc295" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "notificaciones" ("id" SERIAL NOT NULL, "tipo" character varying(40) NOT NULL, "titulo" character varying(120) NOT NULL, "mensaje" character varying(500) NOT NULL, "becadoId" integer, "fechaPedido" date, "datos" jsonb, "leida" boolean NOT NULL DEFAULT false, "leidaEn" TIMESTAMP WITH TIME ZONE, "leidaPorId" integer, "creadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_notificaciones_tipo" CHECK ("tipo" IN ('pedido_cancelado')), CONSTRAINT "PK_a9d32a419ff58b53a38b5ef85d4" PRIMARY KEY ("id"))`);
    await q.query(`CREATE INDEX "IDX_3eec4e97277bd457dfe0d972da" ON "notificaciones"  ("leida", "creadoEn") `);
    await q.query(`CREATE TABLE "turnos_disponibles" ("id" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, "fechaInicio" date NOT NULL, "fechaFin" date, "horaInicio" character varying(5) NOT NULL, "horaFin" character varying(5) NOT NULL, "comidas" character varying(20) array NOT NULL, "diasNoDisponibles" character varying(10) array NOT NULL DEFAULT '{}', "excluirFeriados" boolean NOT NULL DEFAULT false, "especialidades" character varying(100) array NOT NULL, "activo" boolean NOT NULL DEFAULT true, "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), "actualizadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5697f95295e3bd7b0b937048950" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE "pedidos" ("id" SERIAL NOT NULL, "becadoId" integer NOT NULL, "hospitalId" integer NOT NULL, "turnoDisponibleId" integer, "fecha" date NOT NULL, "tipoComida" character varying(20) NOT NULL, "estado" character varying(20) NOT NULL DEFAULT 'pendiente', "entregadoEn" TIMESTAMP WITH TIME ZONE, "entregadoPorId" integer, "recibidoEn" TIMESTAMP WITH TIME ZONE, "valorUnitario" integer NOT NULL, "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7ed2838ea279762ed21aa1b5ffd" UNIQUE ("becadoId", "fecha", "tipoComida"), CONSTRAINT "CHK_pedidos_estado" CHECK ("estado" IN ('pendiente','entregado','cancelado')), CONSTRAINT "CHK_pedidos_tipo_comida" CHECK ("tipoComida" IN ('desayuno','almuerzo','once','cena')), CONSTRAINT "PK_ebb5680ed29a24efdc586846725" PRIMARY KEY ("id"))`);
    await q.query(`CREATE INDEX "IDX_c6d3a517f04979c9032993233a" ON "pedidos"  ("hospitalId") `);
    await q.query(`CREATE INDEX "IDX_d05f72bb11488edb96196b9347" ON "pedidos"  ("turnoDisponibleId") `);
    await q.query(`CREATE INDEX "IDX_b88e1be9218b7913cc9a70ac5f" ON "pedidos"  ("fecha") `);
    await q.query(`CREATE INDEX "IDX_343386ce7f899f99256b04ad43" ON "pedidos"  ("fecha", "estado") `);
    await q.query(`CREATE TABLE "turnos" ("id" SERIAL NOT NULL, "becadoId" integer NOT NULL, "fecha" date NOT NULL, "tipo" character varying(10) NOT NULL DEFAULT 'normal', "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8ee6e87ef68ca02b0c56a61ea5e" UNIQUE ("becadoId", "fecha"), CONSTRAINT "PK_61dbaea0fc136ee2ef981f14782" PRIMARY KEY ("id"))`);
    await q.query(`CREATE INDEX "IDX_d03e3e6829d555b3e008ee5af9" ON "turnos"  ("fecha") `);
    await q.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_d0e86780d6c25ac1a66c2d7f3ff" FOREIGN KEY ("becadoId") REFERENCES "becados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_6daa1fe88a6e29cb5fc3475a93f" FOREIGN KEY ("hospitalId") REFERENCES "hospitales"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "notificaciones" ADD CONSTRAINT "FK_5c3bd4c270c03c79076fac7bd75" FOREIGN KEY ("becadoId") REFERENCES "becados"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "pedidos" ADD CONSTRAINT "FK_764a4059f0798d3b4cb55d2c8ff" FOREIGN KEY ("becadoId") REFERENCES "becados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "pedidos" ADD CONSTRAINT "FK_c6d3a517f04979c9032993233a7" FOREIGN KEY ("hospitalId") REFERENCES "hospitales"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "pedidos" ADD CONSTRAINT "FK_d05f72bb11488edb96196b93473" FOREIGN KEY ("turnoDisponibleId") REFERENCES "turnos_disponibles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "turnos" ADD CONSTRAINT "FK_6840967115b9cba63a38cbf4e56" FOREIGN KEY ("becadoId") REFERENCES "becados"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "turnos" DROP CONSTRAINT "FK_6840967115b9cba63a38cbf4e56"`);
    await q.query(`ALTER TABLE "pedidos" DROP CONSTRAINT "FK_d05f72bb11488edb96196b93473"`);
    await q.query(`ALTER TABLE "pedidos" DROP CONSTRAINT "FK_c6d3a517f04979c9032993233a7"`);
    await q.query(`ALTER TABLE "pedidos" DROP CONSTRAINT "FK_764a4059f0798d3b4cb55d2c8ff"`);
    await q.query(`ALTER TABLE "notificaciones" DROP CONSTRAINT "FK_5c3bd4c270c03c79076fac7bd75"`);
    await q.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_6daa1fe88a6e29cb5fc3475a93f"`);
    await q.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_d0e86780d6c25ac1a66c2d7f3ff"`);
    await q.query(`DROP INDEX "public"."IDX_d03e3e6829d555b3e008ee5af9"`);
    await q.query(`DROP TABLE "turnos"`);
    await q.query(`DROP INDEX "public"."IDX_343386ce7f899f99256b04ad43"`);
    await q.query(`DROP INDEX "public"."IDX_b88e1be9218b7913cc9a70ac5f"`);
    await q.query(`DROP INDEX "public"."IDX_d05f72bb11488edb96196b9347"`);
    await q.query(`DROP INDEX "public"."IDX_c6d3a517f04979c9032993233a"`);
    await q.query(`DROP TABLE "pedidos"`);
    await q.query(`DROP TABLE "turnos_disponibles"`);
    await q.query(`DROP INDEX "public"."IDX_3eec4e97277bd457dfe0d972da"`);
    await q.query(`DROP TABLE "notificaciones"`);
    await q.query(`DROP TABLE "configuracion"`);
    await q.query(`DROP TABLE "feriados"`);
    await q.query(`DROP TABLE "usuarios"`);
    await q.query(`DROP TABLE "hospitales"`);
    await q.query(`DROP TABLE "becados"`);
  }
}
