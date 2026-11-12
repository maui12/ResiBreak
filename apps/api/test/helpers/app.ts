import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Usuario } from '../../src/auth/usuario.entity.js';
import { AppModule } from '../../src/app.module.js';
import { Becado } from '../../src/becados/becado.entity.js';
import { Configuracion } from '../../src/configuracion/configuracion.entity.js';
import { configurarApp } from '../../src/configurar-app.js';
import { Pedido } from '../../src/pedidos/pedido.entity.js';
import { Turno } from '../../src/turnos/turno.entity.js';
import { TurnoDisponible } from '../../src/turnos-disponibles/turno-disponible.entity.js';

export async function crearApp(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app); // misma configuración que en producción
  await app.init(); // al iniciar se crean el admin y los hospitales
  return app;
}

/** Deja la BD limpia, conservando al admin y los hospitales que crea la propia app. */
export async function limpiarDatos(app: INestApplication) {
  const ds = app.get(DataSource);
  await ds.getRepository(Pedido).createQueryBuilder().delete().execute();
  await ds.getRepository(TurnoDisponible).createQueryBuilder().delete().execute();
  await ds.getRepository(Turno).createQueryBuilder().delete().execute();
  await ds.getRepository(Usuario).createQueryBuilder().delete().where(`rol <> 'admin'`).execute();
  await ds.getRepository(Becado).createQueryBuilder().delete().execute();
  // Vuelve a los valores por defecto (se recrea sola en la próxima lectura).
  await ds.getRepository(Configuracion).createQueryBuilder().delete().execute();
}

export async function login(app: INestApplication, rut: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ rut, password });
  if (!res.body.accessToken) throw new Error(`Login falló (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body.accessToken;
}