//test: el proveedor ve lo que tiene que llevar y marca entregas; nadie más puede hacerlo.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Rol } from '../src/common/roles.js';
import { hoyChile, sumarDias } from '../src/common/fecha-chile.js';
import { Pedido } from '../src/pedidos/pedido.entity.js';
import { crearApp, limpiarDatos, login } from './helpers/app.js';

describe('Proveedor (e2e)', () => {
  let app: INestApplication;
  let admin: string;
  let proveedor: string;
  let residente: string;
  let hospitalId: number;
  let pedidoHoy: number;
  let pedidoManana: number;

  const http = () => request(app.getHttpServer());
  const hoy = hoyChile();
  const manana = sumarDias(hoy, 1);
  const CLAVE = 'clave-proveedor-123';

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
    admin = await login(app, process.env.ADMIN_RUT!, process.env.ADMIN_PASSWORD!);

    await http().post('/api/usuarios').auth(admin, { type: 'bearer' }).send({ rut: '9876543-3', password: CLAVE, rol: Rol.PROVEEDOR }).expect(201);
    proveedor = await login(app, '9.876.543-3', CLAVE);

    const becado = await http()
      .post('/api/becados')
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'Ana Pérez', rut: '12345678-5', especialidad: 'Pediatría' })
      .expect(201);
    await http()
      .post('/api/usuarios')
      .auth(admin, { type: 'bearer' })
      .send({ rut: '12345678-5', password: CLAVE, rol: Rol.RESIDENTE, becadoId: becado.body.id })
      .expect(201);
    residente = await login(app, '12345678-5', CLAVE);

    hospitalId = (await http().get('/api/hospitales').auth(admin, { type: 'bearer' })).body[0].id;
    const repo = app.get(DataSource).getRepository(Pedido);
    const base = { becadoId: becado.body.id, hospitalId, valorUnitario: 5000 };
    pedidoHoy = (await repo.save({ ...base, fecha: hoy, tipoComida: 'almuerzo' })).id;
    await repo.save({ ...base, fecha: hoy, tipoComida: 'cena', estado: 'cancelado' });
    pedidoManana = (await repo.save({ ...base, fecha: manana, tipoComida: 'desayuno' })).id;
  });
  afterAll(() => app.close());

  it('GET /proveedor/resumen: hoy y los 7 días siguientes, sin contar lo cancelado', async () => {
    const res = await http().get('/api/proveedor/resumen').auth(proveedor, { type: 'bearer' }).expect(200);
    expect(res.body.hoy).toBe(hoy);
    expect(res.body.dias).toHaveLength(8);
    expect(res.body.dias[0]).toMatchObject({ fecha: hoy, almuerzo: 1, cena: 0, total: 1 });
    expect(res.body.dias[1]).toMatchObject({ fecha: manana, desayuno: 1, total: 1 });
    expect(res.body).toMatchObject({ pendientesHoy: 1, totalProximos7: 1 });
  });

  it('GET /proveedor/pedidos: detalle del día con el hospital de entrega', async () => {
    const res = await http().get('/api/proveedor/pedidos').auth(proveedor, { type: 'bearer' }).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ id: pedidoHoy, tipoComida: 'almuerzo', estado: 'pendiente' });
    expect(res.body.items[0].becado).toMatchObject({ nombre: 'Ana Pérez', especialidad: 'Pediatría' });
    expect(res.body.items[0].becado.hospital).toEqual(expect.any(String));

    const otroDia = await http().get('/api/proveedor/pedidos').query({ fecha: manana }).auth(proveedor, { type: 'bearer' }).expect(200);
    expect(otroDia.body.items.map((p: { id: number }) => p.id)).toEqual([pedidoManana]);
    await http().get('/api/proveedor/pedidos').query({ fecha: '2026-02-31' }).auth(proveedor, { type: 'bearer' }).expect(400);
  });

  it('marca entregado un pedido de hoy, una sola vez', async () => {
    await http().patch(`/api/proveedor/pedidos/${pedidoHoy}/entregar`).auth(proveedor, { type: 'bearer' }).expect(200);
    await http().patch(`/api/proveedor/pedidos/${pedidoHoy}/entregar`).auth(proveedor, { type: 'bearer' }).expect(409);
  });

  it('no entrega pedidos de otro día (400) ni inexistentes (404)', async () => {
    await http().patch(`/api/proveedor/pedidos/${pedidoManana}/entregar`).auth(proveedor, { type: 'bearer' }).expect(400);
    await http().patch('/api/proveedor/pedidos/999999/entregar').auth(proveedor, { type: 'bearer' }).expect(404);
  });

  it('GET /proveedor/historial: filtra y pagina', async () => {
    const res = await http()
      .get('/api/proveedor/historial')
      .query({ estado: 'entregado', limite: 10 })
      .auth(proveedor, { type: 'bearer' })
      .expect(200);
    expect(res.body).toMatchObject({ total: 1, pagina: 1, limite: 10 });
    expect(res.body.items[0]).toMatchObject({ id: pedidoHoy, estado: 'entregado' });
    await http().get('/api/proveedor/historial').query({ limite: 500 }).auth(proveedor, { type: 'bearer' }).expect(400);
  });

  it('SEGURIDAD: un residente no usa las rutas del proveedor (403) y el proveedor no las de admin', async () => {
    await http().get('/api/proveedor/resumen').auth(residente, { type: 'bearer' }).expect(403);
    await http().patch(`/api/proveedor/pedidos/${pedidoManana}/entregar`).auth(residente, { type: 'bearer' }).expect(403);
    await http().get('/api/becados').auth(proveedor, { type: 'bearer' }).expect(403);
    await http().get('/api/notificaciones').auth(proveedor, { type: 'bearer' }).expect(403);
  });
});
